import React, { useRef, useEffect, useMemo } from 'react';
import { Chart, registerables } from 'chart.js';
import { CsvRow } from '../types';

Chart.register(...registerables); // Register all Chart.js components

interface ChartsProps {
  data: CsvRow[];
  processingMode: 'csv' | 'fasta';
}

const Charts: React.FC<ChartsProps> = ({ data, processingMode }) => {
  const histogramCanvasRef = useRef<HTMLCanvasElement>(null);
  const lambdaLandscapeCanvasRef = useRef<HTMLCanvasElement>(null); // Renamed from scatterPlotCanvasRef for clarity
  const amScatterCanvasRef = useRef<HTMLCanvasElement>(null); // New ref for A(N) vs M(N) scatter
  
  const histogramChartRef = useRef<Chart | null>(null);
  const lambdaLandscapeChartRef = useRef<Chart | null>(null); // Renamed
  const amScatterChartRef = useRef<Chart | null>(null); // New ref

  const allFactorizationDetails = useMemo(() => {
    if (!data) return [];
    return data.flatMap(row => (row.factorization_details || []) as { N: number, p: number, q: number, additive_complexity: number, multiplicative_resistance: number }[]);
  }, [data]);

  useEffect(() => {
    if (!data || data.length === 0) {
      if (histogramChartRef.current) histogramChartRef.current.destroy();
      if (lambdaLandscapeChartRef.current) lambdaLandscapeChartRef.current.destroy();
      if (amScatterChartRef.current) amScatterChartRef.current.destroy();
      return;
    }

    const lambdaScores = data.map(row => Number(row.lambda_score)).filter(score => !isNaN(score));

    // Cleanup previous charts
    if (histogramChartRef.current) histogramChartRef.current.destroy();
    if (lambdaLandscapeChartRef.current) lambdaLandscapeChartRef.current.destroy();
    if (amScatterChartRef.current) amScatterChartRef.current.destroy();

    // --- Create Histogram ---
    if (histogramCanvasRef.current) {
      const ctx = histogramCanvasRef.current.getContext('2d');
      if (ctx) {
        const minScore = Math.min(...lambdaScores);
        const maxScore = Math.max(...lambdaScores);
        // Ensure binSize is not zero for cases where all scores are identical
        const binSize = (maxScore - minScore) / 20 || 1; // Default to 1 if range is 0

        const bins: { [key: string]: number } = {};
        
        lambdaScores.forEach(score => {
          const binIndex = Math.floor((score - minScore) / binSize);
          const binStart = minScore + binIndex * binSize;
          const binEnd = minScore + (binIndex + 1) * binSize;
          const binKey = `${binStart.toFixed(2)}-${binEnd.toFixed(2)}`;
          bins[binKey] = (bins[binKey] || 0) + 1;
        });

        const sortedBinLabels = Object.keys(bins).sort((a, b) => {
            const numA = parseFloat(a.split('-')[0]);
            const numB = parseFloat(b.split('-')[0]);
            return numA - numB;
        });
        const histogramData = sortedBinLabels.map(label => bins[label]);

        histogramChartRef.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: sortedBinLabels,
            datasets: [{
              label: 'Number of gRNA Candidates',
              data: histogramData,
              backgroundColor: 'rgba(59, 130, 246, 0.6)',
              borderColor: 'rgba(59, 130, 246, 1)',
              borderWidth: 1,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: 'Distribution of Semiprime λ Scores',
                font: { size: 16, weight: 'bold' },
              },
              legend: { display: false },
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: 'Lambda Score Bins',
                },
                ticks: {
                  autoSkip: true,
                  maxRotation: 45,
                  minRotation: 45,
                }
              },
              y: {
                title: {
                  display: true,
                  text: 'Count',
                },
                beginAtZero: true,
              },
            },
          }
        });
      }
    }

    // --- Create Lambda Landscape Plot (FASTA mode only) ---
    if (processingMode === 'fasta' && lambdaLandscapeCanvasRef.current) {
      const ctx = lambdaLandscapeCanvasRef.current.getContext('2d');
      if (ctx) {
        const scatterData = data.map(row => ({
          x: Number(row.sequence_location),
          y: Number(row.lambda_score),
          protospacer: row.protospacer ? String(row.protospacer) : '',
        }));

        let maxScore = -Infinity;
        let maxScorePoint: {x: number, y: number, protospacer: string} | null = null;

        scatterData.forEach(point => {
          if (point.y > maxScore) {
            maxScore = point.y;
            maxScorePoint = point;
          }
        });

        lambdaLandscapeChartRef.current = new Chart(ctx, {
          type: 'scatter',
          data: {
            datasets: [{
              label: 'Semiprime λ Score',
              data: scatterData.filter(p => p !== maxScorePoint), // All points except the max
              backgroundColor: 'rgba(239, 68, 68, 0.4)',
              borderColor: 'rgba(239, 68, 68, 0.7)',
              pointRadius: 4,
              pointHoverRadius: 6,
            },
            ...(maxScorePoint ? [{ // Highlight the max score point (The Battering Ram)
              label: 'HTT-λ-001 (Battering Ram)',
              data: [{ x: maxScorePoint.x, y: maxScorePoint.y, protospacer: maxScorePoint.protospacer }],
              backgroundColor: 'rgba(0, 128, 0, 1)', // Green color
              borderColor: 'rgba(0, 128, 0, 1)',
              pointRadius: 8,
              pointHoverRadius: 10,
              pointStyle: 'star', // Use a star for emphasis
            }] : [])
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: 'Semiprime λ Landscape: HTT Exon 1',
                font: { size: 16, weight: 'bold' },
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const item = context.raw as { x: number, y: number, protospacer: string };
                    return `Protospacer: ${item.protospacer}, Position: ${item.x}, Score: ${item.y.toFixed(4)}`;
                  }
                }
              },
              annotation: {
                annotations: {
                  cagRepeat: {
                    type: 'line',
                    yMin: 0,
                    yMax: 80, // Conceptual low score region
                    xMin: 100, // Conceptual start of CAG repeat in HTT Exon 1
                    xMax: 150, // Conceptual end of CAG repeat
                    borderColor: 'rgba(255, 165, 0, 0.5)', // Orange
                    borderWidth: 2,
                    label: {
                      content: 'CAG Repeat Tract (Low Info)',
                      enabled: true,
                      position: 'top',
                      font: { size: 10, weight: 'bold' },
                      color: 'orange',
                    }
                  },
                  ...(maxScorePoint ? {
                    batteringRamLine: {
                      type: 'line',
                      xMin: maxScorePoint.x,
                      xMax: maxScorePoint.x,
                      yMin: 0,
                      yMax: maxScorePoint.y,
                      borderColor: 'rgba(0, 128, 0, 0.5)', // Green dashed line
                      borderWidth: 2,
                      borderDash: [5, 5],
                    },
                    batteringRamLabel: {
                      type: 'label',
                      xValue: maxScorePoint.x,
                      yValue: maxScorePoint.y,
                      content: [`TARGET ACQUIRED`, `Score: ${maxScorePoint.y.toFixed(2)}`],
                      backgroundColor: 'rgba(0, 128, 0, 0.7)',
                      borderColor: 'rgba(0, 128, 0, 1)',
                      borderWidth: 1,
                      borderRadius: 6,
                      font: { size: 12, weight: 'bold', color: 'white' },
                      xAdjust: 0,
                      yAdjust: -30,
                    }
                  } : {}),
                }
              }
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: 'Genomic Position (start of protospacer)',
                },
                beginAtZero: true,
              },
              y: {
                title: {
                  display: true,
                  text: 'Lambda Score',
                },
                beginAtZero: true,
              },
            },
          }
        });
      }
    }

    // --- Create A(N) vs M(N) Scatter Plot ---
    if (amScatterCanvasRef.current) {
      const ctx = amScatterCanvasRef.current.getContext('2d');
      if (ctx) {
        const amScatterData = allFactorizationDetails.map(fd => ({
          x: fd.additive_complexity,
          y: fd.multiplicative_resistance,
        }));

        amScatterChartRef.current = new Chart(ctx, {
          type: 'scatter',
          data: {
            datasets: [{
              label: 'Semiprime Factors (A(N) vs M(N))',
              data: amScatterData,
              backgroundColor: 'rgba(75, 192, 192, 0.6)',
              borderColor: 'rgba(75, 192, 192, 1)',
              pointRadius: 4,
              pointHoverRadius: 6,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: 'Semiprime Factorization Clustering: A(N) vs M(N)',
                font: { size: 16, weight: 'bold' },
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const item = context.raw as { x: number, y: number };
                    return `A(N): ${item.x.toFixed(2)}, M(N): ${item.y.toFixed(0)}`;
                  }
                }
              },
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: 'Additive Complexity (A(N) = (p+q)/2)',
                },
                beginAtZero: true,
              },
              y: {
                title: {
                  display: true,
                  text: 'Multiplicative Resistance (M(N) = N = p*q)',
                },
                beginAtZero: true,
              },
            },
          }
        });
      }
    }

    return () => {
      if (histogramChartRef.current) histogramChartRef.current.destroy();
      if (lambdaLandscapeChartRef.current) lambdaLandscapeChartRef.current.destroy();
      if (amScatterChartRef.current) amScatterChartRef.current.destroy();
    };
  }, [data, processingMode, allFactorizationDetails]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
      <div className="bg-white p-4 rounded-lg shadow-md flex flex-col items-center justify-center min-h-[400px]">
        <canvas ref={histogramCanvasRef} className="w-full h-full"></canvas>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-md flex flex-col items-center justify-center min-h-[400px]">
        {processingMode === 'fasta' ? (
          <canvas ref={lambdaLandscapeCanvasRef} className="w-full h-full"></canvas>
        ) : (
          <p className="text-center text-gray-500 text-lg my-auto p-4">
            Genomic Lambda Landscape is only applicable for FASTA input.
          </p>
        )}
      </div>
      <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-md flex flex-col items-center justify-center min-h-[400px]">
        {allFactorizationDetails.length > 0 ? (
           <canvas ref={amScatterCanvasRef} className="w-full h-full"></canvas>
        ) : (
          <p className="text-center text-gray-500 text-lg my-auto p-4">
            A(N) vs M(N) clustering data is generated when gRNA candidates are processed.
          </p>
        )}
      </div>
    </div>
  );
};

export default Charts;