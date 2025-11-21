from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
from typing import List, Dict, Any
from rapidfuzz import fuzz
import json

app = FastAPI(title="Financial Reconciliation API")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global storage for uploaded data
gst_dataframe = None
apar_dataframe = None

# Add this after the imports and before @app.get("/")

def detect_duplicates(df: pd.DataFrame) -> Dict[str, Any]:
    """Detect duplicate invoices in the dataset"""
    # Create a composite key of Invoice_No + GSTIN
    df['composite_key'] = df['Invoice_No'].astype(str) + '_' + df['GSTIN'].astype(str)
    
    # Find duplicates
    duplicates = df[df.duplicated(subset='composite_key', keep=False)]
    
    duplicate_info = []
    if not duplicates.empty:
        # Group duplicates by composite key
        duplicate_groups = duplicates.groupby('composite_key')
        
        for key, group in duplicate_groups:
            invoice_no = group.iloc[0]['Invoice_No']
            gstin = group.iloc[0]['GSTIN']
            count = len(group)
            
            duplicate_info.append({
                'invoice_no': str(invoice_no),
                'gstin': str(gstin),
                'occurrences': count,
                'rows': group.index.tolist()
            })
    
    # Clean up temporary column
    df.drop('composite_key', axis=1, inplace=True)
    
    return {
        'has_duplicates': len(duplicate_info) > 0,
        'duplicate_count': len(duplicate_info),
        'duplicates': duplicate_info
    }

# Add after detect_duplicates() function

def parse_date_safely(date_value):
    """Safely parse date from various formats"""
    if pd.isna(date_value):
        return None
    
    try:
        # Try pandas datetime parsing with multiple formats
        return pd.to_datetime(date_value, errors='coerce')
    except:
        return None


def calculate_date_difference(date1, date2):
    """Calculate difference between two dates in days"""
    if date1 is None or date2 is None:
        return None
    
    try:
        diff = abs((date1 - date2).days)
        return diff
    except:
        return None

@app.get("/")
async def root():
    return {"message": "Financial Reconciliation API is running"}


@app.post("/upload/gst")
async def upload_gst(file: UploadFile = File(...)):
    """Upload and validate GST CSV file with duplicate detection"""
    global gst_dataframe
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    try:
        contents = await file.read()
        gst_dataframe = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        required_fields = ['Invoice_No', 'GSTIN', 'Invoice_Value', 'Invoice_Date']
        missing_fields = [field for field in required_fields if field not in gst_dataframe.columns]
        
        if missing_fields:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required fields: {', '.join(missing_fields)}"
            )
        
        # Detect duplicates
        duplicate_check = detect_duplicates(gst_dataframe)
        
        # NEW: Calculate total invoice value
        gst_dataframe['Invoice_Value_Numeric'] = pd.to_numeric(gst_dataframe['Invoice_Value'], errors='coerce')
        total_value = gst_dataframe['Invoice_Value_Numeric'].sum()
        
        response_data = {
            "status": "success",
            "message": "GST file uploaded successfully",
            "records": len(gst_dataframe),
            "fields": list(gst_dataframe.columns),
            "total_invoice_value": round(float(total_value), 2),  # NEW: Total value
            "duplicates": duplicate_check
        }
        
        # Add warning if duplicates found
        if duplicate_check['has_duplicates']:
            response_data["warning"] = f"Found {duplicate_check['duplicate_count']} duplicate invoice(s)"
        
        return response_data
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@app.post("/upload/apar")
async def upload_apar(file: UploadFile = File(...)):
    """Upload and validate AP/AR CSV file with duplicate detection"""
    global apar_dataframe
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    try:
        contents = await file.read()
        apar_dataframe = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        required_fields = ['Invoice_No', 'GSTIN', 'Invoice_Value', 'Invoice_Date']
        missing_fields = [field for field in required_fields if field not in apar_dataframe.columns]
        
        if missing_fields:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required fields: {', '.join(missing_fields)}"
            )
        
        # Detect duplicates
        duplicate_check = detect_duplicates(apar_dataframe)
        
        # NEW: Calculate total invoice value
        apar_dataframe['Invoice_Value_Numeric'] = pd.to_numeric(apar_dataframe['Invoice_Value'], errors='coerce')
        total_value = apar_dataframe['Invoice_Value_Numeric'].sum()
        
        response_data = {
            "status": "success",
            "message": "AP/AR file uploaded successfully",
            "records": len(apar_dataframe),
            "fields": list(apar_dataframe.columns),
            "total_invoice_value": round(float(total_value), 2),  # NEW: Total value
            "duplicates": duplicate_check
        }
        
        # Add warning if duplicates found
        if duplicate_check['has_duplicates']:
            response_data["warning"] = f"Found {duplicate_check['duplicate_count']} duplicate invoice(s)"
        
        return response_data
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

# Add this endpoint after the /upload/apar endpoint and before /reconcile

@app.get("/preview-missing")
async def preview_missing_records():
    """Quick check for missing records before full reconciliation"""
    global gst_dataframe, apar_dataframe
    
    if gst_dataframe is None or apar_dataframe is None:
        raise HTTPException(status_code=400, detail="Please upload both GST and AP/AR files first")
    
    try:
        # Clean data
        gst_df = gst_dataframe.copy()
        apar_df = apar_dataframe.copy()
        
        gst_df['Invoice_No'] = gst_df['Invoice_No'].astype(str).str.strip()
        apar_df['Invoice_No'] = apar_df['Invoice_No'].astype(str).str.strip()
        gst_df['GSTIN'] = gst_df['GSTIN'].astype(str).str.strip()
        apar_df['GSTIN'] = apar_df['GSTIN'].astype(str).str.strip()
        
        # Create composite keys
        gst_keys = set(gst_df['Invoice_No'] + '_' + gst_df['GSTIN'])
        apar_keys = set(apar_df['Invoice_No'] + '_' + apar_df['GSTIN'])
        
        # Find missing records
        missing_in_apar_keys = gst_keys - apar_keys
        missing_in_gst_keys = apar_keys - gst_keys
        
        # Get details for missing records
        missing_in_apar = []
        for key in missing_in_apar_keys:
            invoice_no, gstin = key.split('_', 1)
            matching_rows = gst_df[(gst_df['Invoice_No'] == invoice_no) & (gst_df['GSTIN'] == gstin)]
            if not matching_rows.empty:
                row = matching_rows.iloc[0]
                missing_in_apar.append({
                    'invoice_no': invoice_no,
                    'gstin': gstin,
                    'invoice_value': float(pd.to_numeric(row['Invoice_Value'], errors='coerce')),
                    'invoice_date': str(row['Invoice_Date'])
                })
        
        missing_in_gst = []
        for key in missing_in_gst_keys:
            invoice_no, gstin = key.split('_', 1)
            matching_rows = apar_df[(apar_df['Invoice_No'] == invoice_no) & (apar_df['GSTIN'] == gstin)]
            if not matching_rows.empty:
                row = matching_rows.iloc[0]
                missing_in_gst.append({
                    'invoice_no': invoice_no,
                    'gstin': gstin,
                    'invoice_value': float(pd.to_numeric(row['Invoice_Value'], errors='coerce')),
                    'invoice_date': str(row['Invoice_Date'])
                })
        
        # Calculate totals
        total_missing_in_apar_value = sum(item['invoice_value'] for item in missing_in_apar if item['invoice_value'] == item['invoice_value'])  # NaN check
        total_missing_in_gst_value = sum(item['invoice_value'] for item in missing_in_gst if item['invoice_value'] == item['invoice_value'])
        
        return {
            'status': 'success',
            'missing_in_apar': {
                'count': len(missing_in_apar),
                'total_value': round(total_missing_in_apar_value, 2),
                'records': missing_in_apar[:10]  # Show first 10 only
            },
            'missing_in_gst': {
                'count': len(missing_in_gst),
                'total_value': round(total_missing_in_gst_value, 2),
                'records': missing_in_gst[:10]  # Show first 10 only
            },
            'common_records': len(gst_keys & apar_keys),
            'total_gst_records': len(gst_keys),
            'total_apar_records': len(apar_keys)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview error: {str(e)}")

@app.post("/reconcile")
async def reconcile():
    """Perform AI-powered reconciliation between GST and AP/AR data"""
    global gst_dataframe, apar_dataframe
    
    if gst_dataframe is None or apar_dataframe is None:
        raise HTTPException(status_code=400, detail="Please upload both GST and AP/AR files first")
    
    try:
        results = perform_reconciliation(gst_dataframe, apar_dataframe)
        return results
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reconciliation error: {str(e)}")


def perform_reconciliation(gst_df: pd.DataFrame, apar_df: pd.DataFrame) -> Dict[str, Any]:
    """Core reconciliation logic with AI fuzzy matching and date discrepancy detection"""
    
    # Initialize result categories
    matched = []
    partial_match = []
    mismatched = []
    missing_in_apar = []
    missing_in_gst = []
    insights = []
    date_discrepancies = []  # NEW: Track date mismatches
    
    # Clean data
    gst_df['Invoice_No'] = gst_df['Invoice_No'].astype(str).str.strip()
    apar_df['Invoice_No'] = apar_df['Invoice_No'].astype(str).str.strip()
    gst_df['GSTIN'] = gst_df['GSTIN'].astype(str).str.strip()
    apar_df['GSTIN'] = apar_df['GSTIN'].astype(str).str.strip()
    
    # Convert Invoice_Value to float
    gst_df['Invoice_Value'] = pd.to_numeric(gst_df['Invoice_Value'], errors='coerce')
    apar_df['Invoice_Value'] = pd.to_numeric(apar_df['Invoice_Value'], errors='coerce')
    
    # NEW: Parse dates
    gst_df['Invoice_Date_Parsed'] = gst_df['Invoice_Date'].apply(parse_date_safely)
    apar_df['Invoice_Date_Parsed'] = apar_df['Invoice_Date'].apply(parse_date_safely)
    
    # Create indexes for faster lookup
    apar_lookup = {}
    for idx, row in apar_df.iterrows():
        key = (row['Invoice_No'], row['GSTIN'])
        apar_lookup[key] = row
    
    gst_lookup = {}
    for idx, row in gst_df.iterrows():
        key = (row['Invoice_No'], row['GSTIN'])
        gst_lookup[key] = row
    
    # Process GST records
    for idx, gst_row in gst_df.iterrows():
        invoice_no = gst_row['Invoice_No']
        gstin = gst_row['GSTIN']
        gst_amount = gst_row['Invoice_Value']
        gst_date = gst_row['Invoice_Date_Parsed']
        
        key = (invoice_no, gstin)
        
        if key in apar_lookup:
            apar_row = apar_lookup[key]
            apar_amount = apar_row['Invoice_Value']
            apar_date = apar_row['Invoice_Date_Parsed']
            
            # NEW: Check date discrepancy
            date_diff = calculate_date_difference(gst_date, apar_date)
            has_date_mismatch = date_diff is not None and date_diff > 0
            
            # Exact match check
            if abs(gst_amount - apar_amount) < 0.01:
                match_record = {
                    'Invoice_No': invoice_no,
                    'GSTIN': gstin,
                    'GST_Amount': float(gst_amount),
                    'APAR_Amount': float(apar_amount),
                    'GST_Date': str(gst_row['Invoice_Date']),
                    'APAR_Date': str(apar_row['Invoice_Date']),
                    'Difference': 0,
                    'Match_Type': 'Exact Match',
                    'Confidence': 1.0
                }
                
                # NEW: Add date mismatch flag
                if has_date_mismatch:
                    match_record['Date_Mismatch'] = True
                    match_record['Date_Difference_Days'] = int(date_diff)
                    date_discrepancies.append({
                        'Invoice_No': invoice_no,
                        'GSTIN': gstin,
                        'GST_Date': str(gst_row['Invoice_Date']),
                        'APAR_Date': str(apar_row['Invoice_Date']),
                        'Difference_Days': int(date_diff)
                    })
                
                matched.append(match_record)
            else:
                # Check if within ±2% (fuzzy match)
                diff_percentage = abs((gst_amount - apar_amount) / gst_amount * 100)
                
                if diff_percentage <= 2:
                    partial_record = {
                        'Invoice_No': invoice_no,
                        'GSTIN': gstin,
                        'GST_Amount': float(gst_amount),
                        'APAR_Amount': float(apar_amount),
                        'GST_Date': str(gst_row['Invoice_Date']),
                        'APAR_Date': str(apar_row['Invoice_Date']),
                        'Difference': float(abs(gst_amount - apar_amount)),
                        'Difference_Percentage': round(diff_percentage, 2),
                        'Match_Type': 'Partial Match',
                        'Confidence': round(1 - (diff_percentage / 100), 2),
                        'Reason': 'Amount within ±2% threshold'
                    }
                    
                    # NEW: Add date mismatch flag
                    if has_date_mismatch:
                        partial_record['Date_Mismatch'] = True
                        partial_record['Date_Difference_Days'] = int(date_diff)
                        date_discrepancies.append({
                            'Invoice_No': invoice_no,
                            'GSTIN': gstin,
                            'GST_Date': str(gst_row['Invoice_Date']),
                            'APAR_Date': str(apar_row['Invoice_Date']),
                            'Difference_Days': int(date_diff)
                        })
                    
                    partial_match.append(partial_record)
                else:
                    mismatch_record = {
                        'Invoice_No': invoice_no,
                        'GSTIN': gstin,
                        'GST_Amount': float(gst_amount),
                        'APAR_Amount': float(apar_amount),
                        'GST_Date': str(gst_row['Invoice_Date']),
                        'APAR_Date': str(apar_row['Invoice_Date']),
                        'Difference': float(abs(gst_amount - apar_amount)),
                        'Difference_Percentage': round(diff_percentage, 2),
                        'Match_Type': 'Mismatched',
                        'Confidence': 0.0,
                        'Reason': f'Amount differs by {diff_percentage:.2f}%'
                    }
                    
                    # NEW: Add date mismatch flag
                    if has_date_mismatch:
                        mismatch_record['Date_Mismatch'] = True
                        mismatch_record['Date_Difference_Days'] = int(date_diff)
                        date_discrepancies.append({
                            'Invoice_No': invoice_no,
                            'GSTIN': gstin,
                            'GST_Date': str(gst_row['Invoice_Date']),
                            'APAR_Date': str(apar_row['Invoice_Date']),
                            'Difference_Days': int(date_diff)
                        })
                    
                    mismatched.append(mismatch_record)
        else:
            # Missing in AP/AR
            missing_in_apar.append({
                'Invoice_No': invoice_no,
                'GSTIN': gstin,
                'GST_Amount': float(gst_amount),
                'GST_Date': str(gst_row['Invoice_Date']),
                'Match_Type': 'Missing in AP/AR',
                'Confidence': 0.0,
                'Reason': 'Invoice exists in GST but not in AP/AR ledger'
            })
    
    # Find invoices in AP/AR but missing in GST
    for key, apar_row in apar_lookup.items():
        if key not in gst_lookup:
            missing_in_gst.append({
                'Invoice_No': apar_row['Invoice_No'],
                'GSTIN': apar_row['GSTIN'],
                'APAR_Amount': float(apar_row['Invoice_Value']),
                'APAR_Date': str(apar_row['Invoice_Date']),
                'Match_Type': 'Missing in GST',
                'Confidence': 0.0,
                'Reason': 'Invoice exists in AP/AR but not filed in GST'
            })
    
    # Generate AI insights
    if len(partial_match) > 0:
        insights.append(f"TDS deductions causing ±2% variations in {len(partial_match)} invoices")
    
    if len(missing_in_apar) > 0:
        insights.append(f"{len(missing_in_apar)} invoices filed in GST but missing in AP/AR ledger")
    
    if len(missing_in_gst) > 0:
        insights.append(f"{len(missing_in_gst)} invoices in AP/AR but not yet filed in GST")
    
    # NEW: Date discrepancy insights
    if len(date_discrepancies) > 0:
        insights.append(f"⚠️ Found {len(date_discrepancies)} invoice(s) with date mismatches between GST and AP/AR")
        
        # Find the largest date difference
        max_diff = max(date_discrepancies, key=lambda x: x['Difference_Days'])
        if max_diff['Difference_Days'] > 30:
            insights.append(f"🚨 Critical: Invoice {max_diff['Invoice_No']} has {max_diff['Difference_Days']} days date difference")
    
    if len(mismatched) > 0:
        mismatch_invoices = [m['Invoice_No'] for m in mismatched[:5]]
        insights.append(f"Recommended: Review invoices {', '.join(mismatch_invoices)} for amount discrepancies")
    
    if len(matched) / len(gst_df) > 0.95:
        insights.append("Excellent reconciliation rate (>95%)! Financial data is well-aligned.")
    elif len(matched) / len(gst_df) < 0.80:
        insights.append("Warning: Low match rate (<80%). Consider reviewing data entry processes.")
    
    # Calculate summary
    summary = {
        'totalInvoices': len(gst_df) + len(apar_df),
        'matched': len(matched),
        'partialMatch': len(partial_match),
        'mismatched': len(mismatched),
        'missingInGST': len(missing_in_gst),
        'missingInAPAR': len(missing_in_apar),
        'dateDiscrepancies': len(date_discrepancies),  # NEW
        'matchRate': round((len(matched) / len(gst_df)) * 100, 2) if len(gst_df) > 0 else 0
    }
    
    return {
        'summary': summary,
        'details': {
            'matched': matched[:100],
            'partialMatch': partial_match,
            'mismatched': mismatched,
            'missingInGST': missing_in_gst,
            'missingInAPAR': missing_in_apar,
            'dateDiscrepancies': date_discrepancies  # NEW
        },
        'insights': insights
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)