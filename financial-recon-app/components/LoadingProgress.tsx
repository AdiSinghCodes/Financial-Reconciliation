'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, Clock, TrendingUp, X } from 'lucide-react';

interface LoadingProgressProps {
  onCancel?: () => void;
}

interface ProcessingStage {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'complete';
  progress: number;
}

export default function LoadingProgress({ onCancel }: LoadingProgressProps) {
  const [stages, setStages] = useState<ProcessingStage[]>([
    { id: 'upload', label: 'Uploading Files', status: 'processing', progress: 0 },
    { id: 'parse', label: 'Parsing Data', status: 'pending', progress: 0 },
    { id: 'validate', label: 'Validating Records', status: 'pending', progress: 0 },
    { id: 'match', label: 'Matching Invoices', status: 'pending', progress: 0 },
    { id: 'analyze', label: 'AI Analysis', status: 'pending', progress: 0 },
    { id: 'finalize', label: 'Generating Report', status: 'pending', progress: 0 },
  ]);

  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [recordsProcessed, setRecordsProcessed] = useState(0);
  const [totalRecords] = useState(150); // This would come from actual data
  const [processingRate, setProcessingRate] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState('Calculating...');
  const [elapsedTime, setElapsedTime] = useState(0);

  // Simulate progress (in real app, this would come from backend)
  useEffect(() => {
    const interval = setInterval(() => {
      setStages(prevStages => {
        const newStages = [...prevStages];
        const currentStage = newStages[currentStageIndex];

        if (currentStage.progress < 100) {
          // Increment progress for current stage
          currentStage.progress = Math.min(100, currentStage.progress + Math.random() * 15);
          currentStage.status = 'processing';

          // Update records processed
          const newProcessed = Math.min(
            totalRecords,
            Math.floor((currentStageIndex * totalRecords / 6) + (currentStage.progress * totalRecords / 600))
          );
          setRecordsProcessed(newProcessed);

        } else if (currentStageIndex < stages.length - 1) {
          // Mark current stage as complete
          currentStage.status = 'complete';
          
          // Move to next stage
          setCurrentStageIndex(prev => prev + 1);
          newStages[currentStageIndex + 1].status = 'processing';
        } else {
          // All stages complete
          currentStage.status = 'complete';
          clearInterval(interval);
        }

        return newStages;
      });
    }, 500); // Update every 500ms

    return () => clearInterval(interval);
  }, [currentStageIndex, stages.length, totalRecords]);

  // Calculate processing rate and time remaining
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
      
      if (recordsProcessed > 0) {
        const rate = recordsProcessed / (elapsedTime || 1);
        setProcessingRate(Math.round(rate));

        const remaining = totalRecords - recordsProcessed;
        if (rate > 0) {
          const secondsRemaining = Math.ceil(remaining / rate);
          if (secondsRemaining > 60) {
            setTimeRemaining(`${Math.ceil(secondsRemaining / 60)} min`);
          } else {
            setTimeRemaining(`${secondsRemaining} sec`);
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [recordsProcessed, elapsedTime, totalRecords]);

  const overallProgress = Math.round(
    (stages.reduce((sum, stage) => sum + stage.progress, 0) / (stages.length * 100)) * 100
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Processing Reconciliation
            </h2>
            <p className="text-gray-600">
              Please wait while we analyze your data...
            </p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              title="Cancel Processing"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Overall Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">Overall Progress</span>
            <span className="text-2xl font-bold text-blue-600">{overallProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out rounded-full relative"
              style={{ width: `${overallProgress}%` }}
            >
              <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="text-xs text-blue-600 font-semibold">Processing Rate</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{processingRate}</p>
            <p className="text-xs text-blue-600">records/sec</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-xs text-green-600 font-semibold">Records Processed</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{recordsProcessed}</p>
            <p className="text-xs text-green-600">of {totalRecords}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <span className="text-xs text-orange-600 font-semibold">Time Remaining</span>
            </div>
            <p className="text-2xl font-bold text-orange-900">{timeRemaining}</p>
            <p className="text-xs text-orange-600">Elapsed: {formatTime(elapsedTime)}</p>
          </div>
        </div>

        {/* Processing Stages */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Steps</h3>
          
          {stages.map((stage, index) => (
            <div key={stage.id} className="relative">
              {/* Connector Line */}
              {index < stages.length - 1 && (
                <div className="absolute left-4 top-10 w-0.5 h-8 bg-gray-200">
                  {stage.status === 'complete' && (
                    <div className="w-full h-full bg-green-500 transition-all duration-300"></div>
                  )}
                </div>
              )}

              <div className="flex items-start gap-4">
                {/* Status Icon */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  stage.status === 'complete' 
                    ? 'bg-green-500 text-white' 
                    : stage.status === 'processing'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}>
                  {stage.status === 'complete' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : stage.status === 'processing' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Stage Details */}
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`font-semibold ${
                      stage.status === 'processing' ? 'text-blue-900' : 
                      stage.status === 'complete' ? 'text-green-900' : 
                      'text-gray-500'
                    }`}>
                      {stage.label}
                    </span>
                    {stage.status !== 'pending' && (
                      <span className={`text-sm font-semibold ${
                        stage.status === 'complete' ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {Math.round(stage.progress)}%
                      </span>
                    )}
                  </div>

                  {/* Stage Progress Bar */}
                  {stage.status !== 'pending' && (
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          stage.status === 'complete' ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${stage.progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Message */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span>
              {stages[currentStageIndex]?.status === 'processing' 
                ? `Currently ${stages[currentStageIndex]?.label.toLowerCase()}...`
                : 'Finalizing results...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}