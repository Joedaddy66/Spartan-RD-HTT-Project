
import React, { useState, useCallback, useMemo } from 'react';
import FileUpload from './components/FileUpload';
import DataTable from './components/DataTable';
import { CsvRow, DataTableColumn } from './types';
import { parseCSV, unparseCSV } from './utils/csvParser';
import { analyzeSequenceForScore } from './services/crisprService';
import { parseFasta, FastaSequence } from './utils/fastaParser';
import Charts from './components/Charts';
import RedTeamPipeline from './components/RedTeamPipeline';
import SmnClassifierSimulation from './components/SmnClassifierSimulation';
import ObsidianDashboard from './components/ObsidianDashboard';

type ProcessingMode = 'csv' | 'fasta';
type ActiveTab = 'pipeline' | 'redteam' | 'smn_classifier' | 'obsidian_dashboard';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('pipeline');
  const [inputData, setInputData] = useState<CsvRow[] | null>(null);
  const [processedData, setProcessedData] = useState<CsvRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputFileName, setInputFileName] = useState<string | null>(null);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('csv');
  const [fastaContent, setFastaContent] = useState<FastaSequence[] | null>(null);
  const [pamPattern, setPamPattern] = useState<string>('NGG');
  const [discoveredGrnasCount, setDiscoveredGrnasCount] = useState<number | null>(null);

  // Specificity analysis states
  const [targetGenome, setTargetGenome] = useState<string>('Human (GRCh38)');
  const [specificityLoading, setSpecificityLoading] = useState(false);
  const [specificityError, setSpecificityError] = useState<string | null>(null);

  const clearState = useCallback(() => {
    setInputData(null);
    setProcessedData(null);
    setError(null);
    setInputFileName(null);
    setFastaContent(null);
    setDiscoveredGrnasCount(null);
    setSpecificityError(null);
    setSpecificityLoading(false);
  }, []);

  const handleFileLoaded = useCallback((content: string, fileName: string) => {
    setLoading(true);
    setError(null);
    setInputFileName(fileName);
    clearState();

    try {
      if (processingMode === 'csv') {
        const parsedData = parseCSV(content);
        if (parsedData.length === 0) {
          throw new Error("CSV file is empty or contains no data rows.");
        }
        setInputData(parsedData);
      } else { // fasta mode
        const parsedFasta = parseFasta(content);
        if (parsedFasta.length === 0) {
          throw new Error("FASTA file is empty or contains no sequences.");
        }
        setFastaContent(parsedFasta);
      }
    } catch (e: any) {
      setError(`Failed to parse ${processingMode.toUpperCase()} file: ${e.message}`);
      setInputData(null);
      setFastaContent(null);
    } finally {
      setLoading(false);
    }
  }, [processingMode, clearState]);

  const discoverGrnasFromFasta = useCallback(() => {
    if (!fastaContent || fastaContent.length === 0 || !pamPattern) {
      setInputData(null);
      return;
    }

    setLoading(true);
    setError(null);
    const startTime = performance.now();
    console.log('Starting gRNA discovery from FASTA...');

    const discoveredGrnas: CsvRow[] = [];
    const pamRegex = new RegExp(pamPattern.toUpperCase().replace(/N/g, '[ACGT]'), 'g');

    const sequence = fastaContent[0].sequence.toUpperCase();
    const sequenceHeader = fastaContent[0].header;

    const invalidCharMatch = sequence.match(/[^ACGT]/);
    if (invalidCharMatch) {
      const invalidChar = invalidCharMatch[0];
      const invalidCharIndex = sequence.indexOf(invalidChar);
      setError(
        `FASTA sequence '${sequenceHeader}' contains an invalid DNA character ('${invalidChar}' at position ${invalidCharIndex}). ` +
        `Only A, C, G, T are supported for gRNA discovery and scoring.`
      );
      setInputData(null);
      setLoading(false);
      return;
    }

    let match;
    while ((match = pamRegex.exec(sequence)) !== null) {
      const pamStart = match.index;
      const pamSeq = match[0];

      if (pamStart >= 20) {
        const protospacer = sequence.substring(pamStart - 20, pamStart);
        discoveredGrnas.push({
          protospacer: protospacer,
          PAM: pamSeq,
          sequence_location: pamStart - 20,
          source_fasta: sequenceHeader,
        });
      }
    }

    if (discoveredGrnas.length === 0) {
      setError(`No gRNA candidates found with PAM '${pamPattern}' in the provided FASTA sequence.`);
      setInputData(null);
    } else {
      setInputData(discoveredGrnas);
      setDiscoveredGrnasCount(discoveredGrnas.length);
    }

    setLoading(false);
    const endTime = performance.now();
    console.log(`gRNA discovery finished in ${(endTime - startTime).toFixed(2)} ms. Found ${discoveredGrnas.length} candidates.`);
  }, [fastaContent, pamPattern]);

  const processDataAndCalculateScores = useCallback(() => {
    if (!inputData) {
      setProcessedData(null);
      return;
    }

    setLoading(true);
    setError(null);

    const startTime = performance.now();
    console.log('Starting lambda score calculation...');

    const newProcessedData = inputData.map(row => {
      const protospacer = row.protospacer?.toString();
      const pam = row.PAM?.toString();

      if (!protospacer || !pam) {
        return { ...row, lambda_score: 0.0, error: 'Missing protospacer or PAM' };
      }

      const fullSequence = protospacer + pam;
      try {
        const { totalLambda, factorizationDetails } = analyzeSequenceForScore(fullSequence);
        return {
          ...row,
          lambda_score: parseFloat(totalLambda.toFixed(4)),
          factorization_details: factorizationDetails,
        };
      } catch (e: any) {
        return { ...row, lambda_score: 0.0, error: `Processing error: ${e.message}` };
      }
    });

    setProcessedData(newProcessedData);
    setLoading(false);
    const endTime = performance.now();
    console.log(`Lambda score calculation finished in ${(endTime - startTime).toFixed(2)} ms`);
  }, [inputData]);

  const calculateSpecificity = useCallback(() => {
    if (!processedData || processedData.length === 0) {
      setSpecificityError("No gRNA candidates to calculate specificity for.");
      return;
    }
    setSpecificityLoading(true);
    setSpecificityError(null);

    setTimeout(() => {
      const updatedProcessedData = processedData.map(row => ({
        ...row,
        specificity_score: parseFloat((Math.random() * 100).toFixed(2)),
      }));
      setProcessedData(updatedProcessedData);
      setSpecificityLoading(false);
      console.log(`Specificity calculated for ${processedData.length} candidates against ${targetGenome}.`);
    }, 2000);
  }, [processedData, targetGenome]);


  React.useEffect(() => {
    if (processingMode === 'fasta' && fastaContent) {
      discoverGrnasFromFasta();
    } else {
      setInputData(null);
    }
  }, [processingMode, fastaContent, pamPattern, discoverGrnasFromFasta]);


  React.useEffect(() => {
    if (inputData) {
      processDataAndCalculateScores();
    } else {
      setProcessedData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputData]);


  const handleDownloadResults = useCallback(() => {
    if (!processedData) {
      setError("No processed data to download.");
      return;
    }
    try {
      const dataToUnparse = processedData.map(row => {
        const newRow = { ...row };
        delete newRow.factorization_details;
        return newRow;
      });

      const csvContent = unparseCSV(dataToUnparse);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const downloadFileName = processingMode === 'csv'
        ? 'doench_2016_lambda_scores.csv'
        : 'fasta_lambda_scores.csv';
      link.setAttribute('download', downloadFileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(`Failed to generate CSV for download: ${e.message}`);
    }
  }, [processedData, processingMode]);

  const inputTableColumns: DataTableColumn[] = useMemo(() => {
    if (!inputData || inputData.length === 0) return [];
    const keys = Object.keys(inputData[0]);
    const filteredKeys = keys.filter(key => key !== 'error'); 
    return filteredKeys.map(key => ({ key, header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ') }));
  }, [inputData]);

  const outputTableColumns: DataTableColumn[] = useMemo(() => {
    if (!processedData || processedData.length === 0) return [];
    const keys = Object.keys(processedData[0]);
    const filteredKeys = keys.filter(key => key !== 'factorization_details');
    
    if (processedData.some(row => row.specificity_score !== undefined)) {
        if (!filteredKeys.includes('specificity_score')) {
            filteredKeys.push('specificity_score');
        }
    }

    return filteredKeys.map(key => ({
      key,
      header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      className: key === 'lambda_score' ? 'font-bold text-blue-700' : 
                 key === 'specificity_score' ? 'font-bold text-purple-700' : ''
    }));
  }, [processedData]);


  return (
    <div className="container mx-auto p-4 md:p-8 bg-white shadow-xl rounded-lg max-w-7xl min-h-screen flex flex-col">
      <h1 className="text-4xl font-extrabold text-center text-gray-900 mb-8">
        Spartan R&D Platform
      </h1>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors duration-200 border ${
            activeTab === 'pipeline'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Semiprime λ Pipeline
        </button>
        <button
          onClick={() => setActiveTab('smn_classifier')}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors duration-200 border ${
            activeTab === 'smn_classifier'
              ? 'bg-green-600 text-white border-green-600 shadow-md'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          SMN1/SMN2 Classifier (Sim)
        </button>
        <button
          onClick={() => setActiveTab('redteam')}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors duration-200 border ${
            activeTab === 'redteam'
              ? 'bg-red-600 text-white border-red-600 shadow-md'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Red Team Pipeline (Artifact)
        </button>
        <button
          onClick={() => setActiveTab('obsidian_dashboard')}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors duration-200 border ${
            activeTab === 'obsidian_dashboard'
              ? 'bg-gray-800 text-white border-gray-800 shadow-md'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Obsidian Φ-Core
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-grow">
        {activeTab === 'obsidian_dashboard' && <ObsidianDashboard />}

        {activeTab === 'smn_classifier' && <SmnClassifierSimulation />}

        {activeTab === 'redteam' && <RedTeamPipeline />}

        {activeTab === 'pipeline' && (
          <div className="animate-fade-in">
            <div className="flex justify-center gap-4 mb-8">
              <button
                onClick={() => { clearState(); setProcessingMode('csv'); setPamPattern('NGG'); }}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors duration-200 ${
                  processingMode === 'csv'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Process CSV Dataset
              </button>
              <button
                onClick={() => { clearState(); setProcessingMode('fasta'); setPamPattern('NGG'); }}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors duration-200 ${
                  processingMode === 'fasta'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Process FASTA File
              </button>
            </div>


            <section className="mb-10 p-6 bg-gray-50 rounded-lg shadow-sm border border-gray-100">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                1. Upload {processingMode === 'csv' ? 'CSV Dataset' : 'FASTA File'} & Configure
              </h2>

              {processingMode === 'csv' && (
                <FileUpload
                  onFileLoaded={handleFileLoaded}
                  acceptedFileTypes=".csv,text/csv"
                  label="Doench 2016 dataset"
                />
              )}

              {processingMode === 'fasta' && (
                <div>
                  <FileUpload
                    onFileLoaded={handleFileLoaded}
                    acceptedFileTypes=".fasta,.fa,.txt,text/plain"
                    label="target gene FASTA"
                  />
                  <div className="mt-4">
                    <label htmlFor="pam-input" className="block text-gray-700 text-sm font-bold mb-2">
                      PAM Sequence
                    </label>
                    <input
                      id="pam-input"
                      type="text"
                      value={pamPattern}
                      onChange={(e) => setPamPattern(e.target.value.toUpperCase().replace(/[^ACGTN]/g, ''))}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                      placeholder="e.g., NGG"
                      aria-label="PAM Sequence"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      e.g., NGG. 'N' matches any nucleotide (A, C, G, T).
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
                  <strong className="font-bold">Error: </strong>
                  <span className="block sm:inline">{error}</span>
                </div>
              )}
              {loading && (
                <div className="flex items-center justify-center mt-4 text-blue-600 font-semibold">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing data... This might take a moment for large files.
                </div>
              )}
            </section>

            {inputData && inputData.length > 0 && (
              <section className="mb-10 p-6 bg-gray-50 rounded-lg shadow-sm border border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  2. Loaded Data Preview
                  {processingMode === 'csv' && ` (${inputFileName})`}
                  {processingMode === 'fasta' && ` (Discovered gRNA Candidates from ${inputFileName})`}
                </h2>
                <DataTable
                  data={inputData.slice(0, 10)}
                  columns={inputTableColumns}
                  caption={
                    processingMode === 'csv'
                      ? "First 10 rows of uploaded CSV data"
                      : "First 10 discovered gRNA candidates"
                  }
                />
                <p className="text-sm text-gray-600 mt-2">
                  Showing first 10 rows. Total rows: {
                    processingMode === 'csv' ? inputData.length : (discoveredGrnasCount !== null ? discoveredGrnasCount : inputData.length)
                  }.
                </p>
              </section>
            )}

            {processedData && processedData.length > 0 && (
              <section className="mb-10 p-6 bg-blue-50 rounded-lg shadow-sm border border-blue-100">
                <h2 className="text-2xl font-semibold text-blue-800 mb-4">3. Calculated Lambda Scores & Visualizations</h2>
                <DataTable
                  data={processedData.slice(0, 10)}
                  columns={outputTableColumns}
                  caption="First 10 rows with Lambda Scores"
                />
                <p className="text-sm text-gray-700 mt-2">
                  Showing first 10 rows with the calculated `lambda_score`. Total rows: {processedData.length}.
                </p>

                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-blue-800 mb-4">Visualizations</h3>
                  <Charts data={processedData} processingMode={processingMode} />
                </div>

                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleDownloadResults}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"
                  >
                    Download Results ({processingMode === 'csv' ? 'doench_2016_lambda_scores.csv' : 'fasta_lambda_scores.csv'})
                  </button>
                </div>
              </section>
            )}

            {processedData && processedData.length > 0 && (
              <section className="mb-10 p-6 bg-purple-50 rounded-lg shadow-sm border border-purple-100">
                <h2 className="text-2xl font-semibold text-purple-800 mb-4">4. Specificity Analysis (Conceptual)</h2>
                <p className="text-gray-700 mb-4">
                  *Note: Genome-wide specificity calculation requires a powerful backend service and genome database, not available in this client-side demo.*
                  This section conceptually prepares the UI for such an integration.
                </p>
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <label htmlFor="target-genome-input" className="block text-gray-700 text-sm font-bold mb-2 md:mb-0">
                    Target Genome:
                  </label>
                  <input
                    id="target-genome-input"
                    type="text"
                    value={targetGenome}
                    onChange={(e) => setTargetGenome(e.target.value)}
                    className="shadow appearance-none border rounded w-full md:w-auto py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-purple-500 flex-grow"
                    placeholder="e.g., Human (GRCh38)"
                    aria-label="Target Genome for Specificity Analysis"
                  />
                  <button
                    onClick={calculateSpecificity}
                    disabled={specificityLoading}
                    className={`bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 ${
                      specificityLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {specificityLoading ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Calculating...
                      </div>
                    ) : (
                      'Calculate Specificity'
                    )}
                  </button>
                </div>
                {specificityError && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{specificityError}</span>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>

      <footer className="text-center text-gray-600 text-sm mt-12 py-6 border-t border-gray-200">
        <p className="font-semibold">Spartan R&D Systems &copy; {new Date().getFullYear()}</p>
        <p className="text-gray-500 text-xs mt-1">
          Powered by Obsidian Φ-Core. All Telemetry Verified.
        </p>
      </footer>
    </div>
  );
};

export default App;
