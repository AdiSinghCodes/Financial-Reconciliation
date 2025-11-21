import pandas as pd
import random
from datetime import datetime, timedelta
from faker import Faker

fake = Faker('en_IN')  # Indian locale for realistic names
random.seed(42)  # For reproducibility

# Configuration
TOTAL_RECORDS = 1000
EXACT_MATCH_COUNT = 850
FUZZY_MATCH_COUNT = 100
MISSING_IN_APAR = 25
MISSING_IN_GST = 25

# Helper functions
def generate_gstin():
    """Generate realistic GSTIN format: 27ABCDE1234F1Z5"""
    state_code = random.choice(['27', '29', '07', '09', '19', '24'])
    pan = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=10))
    entity = random.choice(['1', '2', '4'])
    check = random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    return f"{state_code}{pan}{entity}Z{check}"

def generate_invoice_no(index):
    """Generate invoice number"""
    return f"INV-{str(index).zfill(5)}"

def random_date(start_date, end_date):
    """Generate random date between start and end"""
    delta = end_date - start_date
    random_days = random.randint(0, delta.days)
    return start_date + timedelta(days=random_days)

# Date range: Sep 2024 to Sep 2025
start_date = datetime(2024, 9, 1)
end_date = datetime(2025, 9, 30)

# Generate base data for matching records
base_records = []

for i in range(EXACT_MATCH_COUNT + FUZZY_MATCH_COUNT):
    gstin = generate_gstin()
    trade_name = fake.company()
    invoice_no = generate_invoice_no(i + 1)
    invoice_date = random_date(start_date, end_date)
    taxable_value = round(random.uniform(10000, 500000), 2)
    
    # Tax calculation
    tax_rate = random.choice([0.05, 0.12, 0.18, 0.28])
    total_tax = round(taxable_value * tax_rate, 2)
    
    # Determine CGST/SGST vs IGST
    is_interstate = random.choice([True, False])
    if is_interstate:
        cgst = 0
        sgst = 0
        igst = total_tax
    else:
        cgst = round(total_tax / 2, 2)
        sgst = round(total_tax / 2, 2)
        igst = 0
    
    invoice_value = round(taxable_value + total_tax, 2)
    
    base_records.append({
        'gstin': gstin,
        'trade_name': trade_name,
        'invoice_no': invoice_no,
        'invoice_date': invoice_date,
        'invoice_value': invoice_value,
        'taxable_value': taxable_value,
        'cgst': cgst,
        'sgst': sgst,
        'igst': igst,
        'total_tax': total_tax,
        'place_of_supply': fake.state(),
        'is_interstate': is_interstate
    })

print(f"✅ Generated {len(base_records)} base records")

# Create GST Dataset
gst_data = []

# Add exact matches + fuzzy matches
for record in base_records:
    gst_data.append({
        'GSTIN': record['gstin'],
        'Trade_Name': record['trade_name'],
        'Invoice_No': record['invoice_no'],
        'Invoice_Date': record['invoice_date'].strftime('%Y-%m-%d'),
        'Invoice_Value': record['invoice_value'],
        'Taxable_Value': record['taxable_value'],
        'CGST_Amount': record['cgst'],
        'SGST_Amount': record['sgst'],
        'IGST_Amount': record['igst'],
        'Total_Tax': record['total_tax'],
        'Reverse_Charge': random.choice(['Yes', 'No']),
        'Place_of_Supply': record['place_of_supply'],
        'Filing_Period': record['invoice_date'].strftime('%b-%Y'),
        'Upload_Timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })

# Add records missing in AP/AR
for i in range(MISSING_IN_APAR):
    idx = EXACT_MATCH_COUNT + FUZZY_MATCH_COUNT + i
    gstin = generate_gstin()
    taxable_value = round(random.uniform(10000, 500000), 2)
    total_tax = round(taxable_value * 0.18, 2)
    invoice_value = round(taxable_value + total_tax, 2)
    invoice_date = random_date(start_date, end_date)
    
    gst_data.append({
        'GSTIN': gstin,
        'Trade_Name': fake.company(),
        'Invoice_No': generate_invoice_no(idx + 1),
        'Invoice_Date': invoice_date.strftime('%Y-%m-%d'),
        'Invoice_Value': invoice_value,
        'Taxable_Value': taxable_value,
        'CGST_Amount': round(total_tax / 2, 2),
        'SGST_Amount': round(total_tax / 2, 2),
        'IGST_Amount': 0,
        'Total_Tax': total_tax,
        'Reverse_Charge': 'No',
        'Place_of_Supply': fake.state(),
        'Filing_Period': invoice_date.strftime('%b-%Y'),
        'Upload_Timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })

print(f"✅ GST dataset: {len(gst_data)} records")

# Create AP/AR Dataset
apar_data = []

# Add exact matches (first 850)
for i, record in enumerate(base_records[:EXACT_MATCH_COUNT]):
    apar_data.append({
        'Vendor_Customer_Name': record['trade_name'],
        'GSTIN': record['gstin'],
        'Invoice_No': record['invoice_no'],
        'Invoice_Date': record['invoice_date'].strftime('%Y-%m-%d'),
        'Ledger_Type': random.choice(['Payable', 'Receivable']),
        'Invoice_Value': record['invoice_value'],  # Exact match
        'Taxable_Value': record['taxable_value'],
        'CGST_Amount': record['cgst'],
        'SGST_Amount': record['sgst'],
        'IGST_Amount': record['igst'],
        'Total_Tax': record['total_tax'],
        'Payment_Status': random.choice(['Paid', 'Unpaid', 'Partial']),
        'Payment_Date': (record['invoice_date'] + timedelta(days=random.randint(1, 30))).strftime('%Y-%m-%d'),
        'TDS_Deducted': round(record['invoice_value'] * 0.01, 2) if random.random() > 0.5 else 0,
        'Account_Code': f"ACC-{random.randint(1000, 9999)}",
        'Remarks': random.choice(['Verified', 'Pending review', 'Approved', '']),
        'Upload_Timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })

# Add fuzzy matches (next 100) - with ±2% amount variation
for i, record in enumerate(base_records[EXACT_MATCH_COUNT:]):
    # Add small variation to invoice value
    variation = random.uniform(-0.02, 0.02)  # ±2%
    fuzzy_invoice_value = round(record['invoice_value'] * (1 + variation), 2)
    
    apar_data.append({
        'Vendor_Customer_Name': record['trade_name'],
        'GSTIN': record['gstin'],
        'Invoice_No': record['invoice_no'],
        'Invoice_Date': record['invoice_date'].strftime('%Y-%m-%d'),
        'Ledger_Type': random.choice(['Payable', 'Receivable']),
        'Invoice_Value': fuzzy_invoice_value,  # Fuzzy match
        'Taxable_Value': record['taxable_value'],
        'CGST_Amount': record['cgst'],
        'SGST_Amount': record['sgst'],
        'IGST_Amount': record['igst'],
        'Total_Tax': record['total_tax'],
        'Payment_Status': random.choice(['Paid', 'Unpaid', 'Partial']),
        'Payment_Date': (record['invoice_date'] + timedelta(days=random.randint(1, 30))).strftime('%Y-%m-%d'),
        'TDS_Deducted': round(record['invoice_value'] * 0.01, 2),
        'Account_Code': f"ACC-{random.randint(1000, 9999)}",
        'Remarks': 'Amount discrepancy - verify TDS',
        'Upload_Timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })

# Add records missing in GST
for i in range(MISSING_IN_GST):
    idx = EXACT_MATCH_COUNT + FUZZY_MATCH_COUNT + MISSING_IN_APAR + i
    gstin = generate_gstin()
    taxable_value = round(random.uniform(10000, 500000), 2)
    total_tax = round(taxable_value * 0.18, 2)
    invoice_value = round(taxable_value + total_tax, 2)
    invoice_date = random_date(start_date, end_date)
    
    apar_data.append({
        'Vendor_Customer_Name': fake.company(),
        'GSTIN': gstin,
        'Invoice_No': generate_invoice_no(idx + 1),
        'Invoice_Date': invoice_date.strftime('%Y-%m-%d'),
        'Ledger_Type': random.choice(['Payable', 'Receivable']),
        'Invoice_Value': invoice_value,
        'Taxable_Value': taxable_value,
        'CGST_Amount': round(total_tax / 2, 2),
        'SGST_Amount': round(total_tax / 2, 2),
        'IGST_Amount': 0,
        'Total_Tax': total_tax,
        'Payment_Status': 'Unpaid',
        'Payment_Date': '',
        'TDS_Deducted': 0,
        'Account_Code': f"ACC-{random.randint(1000, 9999)}",
        'Remarks': 'Missing in GST filing',
        'Upload_Timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })

print(f"✅ AP/AR dataset: {len(apar_data)} records")

# Convert to DataFrames and save as CSV
df_gst = pd.DataFrame(gst_data)
df_apar = pd.DataFrame(apar_data)

df_gst.to_csv('gst_data.csv', index=False)
df_apar.to_csv('apar_data.csv', index=False)

print("\n🎉 Success! Files created:")
print("📄 gst_data.csv")
print("📄 apar_data.csv")
print(f"\n📊 Dataset Statistics:")
print(f"   - Exact matches: {EXACT_MATCH_COUNT}")
print(f"   - Fuzzy matches: {FUZZY_MATCH_COUNT}")
print(f"   - Missing in AP/AR: {MISSING_IN_APAR}")
print(f"   - Missing in GST: {MISSING_IN_GST}")