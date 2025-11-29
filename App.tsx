import React, { useState, useCallback, useMemo } from 'react';
import FileUpload from './components/FileUpload';
import DataTable from './components/DataTable';
import { CsvRow, DataTableColumn } from './types';
import { parseCSV, unparseCSV } from './utils/csvParser';
import { analyzeSequenceForScore } from './services/crisprService';
import { parseFasta, FastaSequence } from './utils/fastaParser';

type ProcessingMode = 'csv' | 'fasta';

const App: React.FC = () => {
  const [inputData, setInputData] = useState<CsvRow[] | null>(null); // For CSV or discovered gRNAs from FASTA
  const [processedData, setProcessedData] = useState<CsvRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputFileName, setInputFileName] = useState<string | null>(null);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('csv');
  const [fastaContent, setFastaContent] = useState<FastaSequence[] | null>(null);
  const [pamPattern, setPamPattern] = useState<string>('NGG');
  const [discoveredGrnasCount, setDiscoveredGrnasCount] = useState<number | null>(null);

  const clearState = useCallback(() => {
    setInputData(null);
    setProcessedData(null);
    setError(null);
    setInputFileName(null);
    setFastaContent(null);
    setDiscoveredGrnasCount(null);
  }, []);

  const handleFileLoaded = useCallback((content: string, fileName: string) => {
    setLoading(true);
    setError(null);
    setInputFileName(fileName);
    clearState(); // Clear all state when a new file is loaded

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
        // Trigger gRNA discovery after FASTA is loaded
        // This will be called via useEffect reacting to fastaContent change
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
      setInputData(null); // Clear previous gRNAs if conditions aren't met
      return;
    }

    setLoading(true);
    setError(null);
    const startTime = performance.now();
    console.log('Starting gRNA discovery from FASTA...');

    const discoveredGrnas: CsvRow[] = [];
    const pamRegex = new RegExp(pamPattern.toUpperCase().replace(/N/g, '[ACGT]'), 'g'); // 'g' for global search

    // For simplicity, process only the first sequence in the FASTA file
    // Real-world applications might iterate through all or let user select
    const sequence = fastaContent[0].sequence.toUpperCase(); 

    let match;
    while ((match = pamRegex.exec(sequence)) !== null) {
      const pamStart = match.index;
      const pamSeq = match[0]; // The actual matched PAM sequence

      if (pamStart >= 20) { // Ensure there are at least 20 bases before the PAM
        const protospacer = sequence.substring(pamStart - 20, pamStart);
        discoveredGrnas.push({
          protospacer: protospacer,
          PAM: pamSeq,
          sequence_location: pamStart - 20, // 0-indexed start of protospacer
          source_fasta: fastaContent[0].header,
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
        const lambdaScore = analyzeSequenceForScore(fullSequence);
        return { ...row, lambda_score: parseFloat(lambdaScore.toFixed(4)) }; // Round for display
      } catch (e: any) {
        return { ...row, lambda_score: 0.0, error: `Processing error: ${e.message}` };
      }
    });

    setProcessedData(newProcessedData);
    setLoading(false);
    const endTime = performance.now();
    console.log(`Lambda score calculation finished in ${(endTime - startTime).toFixed(2)} ms`);
  }, [inputData]);

  // Trigger gRNA discovery when FASTA content or PAM pattern changes
  React.useEffect(() => {
    if (processingMode === 'fasta' && fastaContent) {
      discoverGrnasFromFasta();
    } else {
      setInputData(null); // Clear inputData if not in fasta mode or no fastaContent
    }
  }, [processingMode, fastaContent, pamPattern, discoverGrnasFromFasta]);


  // Trigger lambda score calculation when inputData is set (either from CSV or discovered gRNAs)
  React.useEffect(() => {
    if (inputData) {
      processDataAndCalculateScores();
    } else {
      setProcessedData(null); // Clear processed data if inputData is null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputData]); // Only re-run when inputData changes


  const handleDownloadResults = useCallback(() => {
    if (!processedData) {
      setError("No processed data to download.");
      return;
    }
    try {
      const csvContent = unparseCSV(processedData);
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
    // Filter out 'error' column for input preview if it exists
    const filteredKeys = keys.filter(key => key !== 'error'); 
    return filteredKeys.map(key => ({ key, header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ') }));
  }, [inputData]);

  const outputTableColumns: DataTableColumn[] = useMemo(() => {
    if (!processedData || processedData.length === 0) return [];
    const keys = Object.keys(processedData[0]);
    return keys.map(key => ({
      key,
      header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      className: key === 'lambda_score' ? 'font-bold text-blue-700' : ''
    }));
  }, [processedData]);


  return (
    <div className="container mx-auto p-4 md:p-8 bg-white shadow-xl rounded-lg max-w-7xl">
      <h1 className="text-4xl font-extrabold text-center text-gray-900 mb-8">
        Semiprime λ Pipeline
      </h1>

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


      <section className="mb-10 p-6 bg-gray-50 rounded-lg shadow-sm">
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
        <section className="mb-10 p-6 bg-gray-50 rounded-lg shadow-sm">
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
        <section className="mb-10 p-6 bg-blue-50 rounded-lg shadow-sm">
          <h2 className="text-2xl font-semibold text-blue-800 mb-4">3. Calculated Lambda Scores</h2>
          <DataTable
            data={processedData.slice(0, 10)}
            columns={outputTableColumns}
            caption="First 10 rows with Lambda Scores"
          />
          <p className="text-sm text-gray-700 mt-2">
            Showing first 10 rows with the calculated `lambda_score`. Total rows: {processedData.length}.
          </p>
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

      <footer className="text-center text-gray-600 text-sm mt-8">
        <p>&copy; {new Date().getFullYear()} Semiprime λ Pipeline. All rights reserved.</p>
        <p className="mt-2">
          Inspired by the Huntington's Disease (HTT) dataset analysis.
        </p>
      </footer>
    </div>
  );
};

export default App;