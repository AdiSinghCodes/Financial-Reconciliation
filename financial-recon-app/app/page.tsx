'use client';

import { useState } from 'react';
import FileUpload from '@/components/FileUpload';
import DataSummary from '@/components/DataSummary';
import ReconciliationResults from '@/components/ReconciliationResults';
import LoadingProgress from '@/components/LoadingProgress';
import { Upload, Database, BarChart3, CheckCircle } from 'lucide-react';

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [aparFile, setAparFile] = useState<File | null>(null);
  const [gstData, setGstData] = useState<any>(null);
  const [aparData, setAparData] = useState<any>(null);
  const [reconciliationResults, setReconciliationResults] = useState<any>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleGSTFileSelect = (file: File | null) => {
    setGstFile(file);
  };

  const handleAPARFileSelect = (file: File | null) => {
    setAparFile(file);
  };

  const uploadFiles = async () => {
    if (!gstFile || !aparFile) {
      alert('Please upload both files first!');
      return;
    }

    setIsUploading(true);
    console.log('Starting file upload...');

    try {
      console.log('GST File:', gstFile.name);
      console.log('AP/AR File:', aparFile.name);

      // Upload GST file
      const formData1 = new FormData();
      formData1.append('file', gstFile);
      
      console.log('Uploading GST file to http://localhost:8000/upload/gst');
      const gstResponse = await fetch('http://localhost:8000/upload/gst', {
        method: 'POST',
        body: formData1,
      });
      
      console.log('GST Response status:', gstResponse.status);
      
      if (!gstResponse.ok) {
        const errorData = await gstResponse.json();
        throw new Error(`GST upload failed: ${errorData.detail || gstResponse.status}`);
      }
      
      const gstResult = await gstResponse.json();
      console.log('GST upload result:', gstResult);
      setGstData(gstResult);

      // Upload AP/AR file
      const formData2 = new FormData();
      formData2.append('file', aparFile);
      
      console.log('Uploading AP/AR file to http://localhost:8000/upload/apar');
      const aparResponse = await fetch('http://localhost:8000/upload/apar', {
        method: 'POST',
        body: formData2,
      });
      
      console.log('AP/AR Response status:', aparResponse.status);
      
      if (!aparResponse.ok) {
        const errorData = await aparResponse.json();
        throw new Error(`AP/AR upload failed: ${errorData.detail || aparResponse.status}`);
      }
      
      const aparResult = await aparResponse.json();
      console.log('AP/AR upload result:', aparResult);
      setAparData(aparResult);

      console.log('Both files uploaded successfully! Moving to step 3');
      setCurrentStep(3);
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReconcile = async () => {
    setIsReconciling(true);
    setCurrentStep(4);

    try {
      const response = await fetch('http://localhost:8000/reconcile', {
        method: 'POST',
      });
      
      const results = await response.json();
      setReconciliationResults(results);
      setCurrentStep(5);
    } catch (error) {
      console.error('Reconciliation error:', error);
      alert('Reconciliation failed. Please try again.');
      setCurrentStep(3);
    } finally {
      setIsReconciling(false);
    }
  };

  const handleCancelProcessing = () => {
    if (confirm('Are you sure you want to cancel the reconciliation process?')) {
      setIsReconciling(false);
      setCurrentStep(3);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setGstFile(null);
    setAparFile(null);
    setGstData(null);
    setAparData(null);
    setReconciliationResults(null);
  };

  const steps = [
    { number: 1, title: 'Upload Files', icon: Upload },
    { number: 2, title: 'Process Data', icon: Database },
    { number: 3, title: 'Review Data', icon: BarChart3 },
    { number: 4, title: 'Reconcile', icon: CheckCircle },
    { number: 5, title: 'Results', icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Show Loading Progress during reconciliation */}
      {currentStep === 4 && isReconciling ? (
        <LoadingProgress onCancel={handleCancelProcessing} />
      ) : (
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              AI-Powered Financial Reconciliation
            </h1>
            <p className="text-gray-600">
              Automate GST vs AP/AR reconciliation with intelligent insights
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-12">
            <div className="flex justify-between items-center max-w-4xl mx-auto">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep >= step.number;
                const isCompleted = currentStep > step.number;

                return (
                  <div key={step.number} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-300 text-gray-500'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-6 w-6" />
                        ) : (
                          <Icon className="h-6 w-6" />
                        )}
                      </div>
                      <span
                        className={`mt-2 text-sm font-medium ${
                          isActive ? 'text-blue-600' : 'text-gray-500'
                        }`}
                      >
                        {step.title}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`h-1 flex-1 mx-4 transition-all ${
                          currentStep > step.number ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-6xl mx-auto">
            {/* Step 1: Upload Files */}
            {currentStep === 1 && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Upload Your Files
                </h2>
                
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <FileUpload
                    label="Upload GST Filing Data (CSV)"
                    onFileSelect={handleGSTFileSelect}
                    file={gstFile}
                  />
                  
                  <FileUpload
                    label="Upload AP/AR Ledger Data (CSV)"
                    onFileSelect={handleAPARFileSelect}
                    file={aparFile}
                  />
                </div>

                <button
                  onClick={() => {
                    console.log('Process Files button clicked!');
                    uploadFiles();
                  }}
                  disabled={!gstFile || !aparFile || isUploading}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isUploading ? 'Processing...' : 'Process Files'}
                </button>
              </div>
            )}

            {/* Step 3: Review Data */}
            {currentStep === 3 && gstData && aparData && (
              <DataSummary
                gstData={gstData}
                aparData={aparData}
                onReconcile={handleReconcile}
              />
            )}

            {/* Step 5: Results */}
            {currentStep === 5 && reconciliationResults && (
              <ReconciliationResults
                results={reconciliationResults}
                onReset={handleReset}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}