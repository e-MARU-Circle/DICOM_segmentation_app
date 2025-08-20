import { useState, useEffect, useRef } from 'react';
import ForceGraph3D from '3d-force-graph';

import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// Removed: import rehypeRaw from 'rehype-raw';
import './App.css'; // CSSファイルをインポート

function App() {
  const [data, setData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] });
  const [error, setError] = useState<string | null>(null);
  const graphRef = useRef<any>(null);

  // Content panel state
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [pageContent, setPageContent] = useState<string>('');
  const [isPanelOpen, setIsPanelOpen] = useState(false); // Simplified state
  const [isLoading, setIsLoading] = useState(false);
  const [fontSize, setFontSize] = useState(16); // State for font size
  const [databaseTitle, setDatabaseTitle] = useState<string>(''); // New state for database title

  // Fetch graph data
  useEffect(() => {
    fetch('http://localhost:3000/api/graph-data')
      .then(res => {
        if (!res.ok) {
          return res.json().then(errData => {
            throw new Error(JSON.stringify(errData.details || errData));
          });
        }
        return res.json();
      })
      .then(apiData => {
        if (apiData && apiData.nodes) {
          const processedData = {
            nodes: apiData.nodes,
            links: apiData.links
          };
          setData(processedData);
          setError(null);
          setDatabaseTitle(apiData.databaseTitle || ''); // Set database title
        } else {
          throw new Error('Received invalid data format');
        }
      })
      .catch(err => {
        console.error('Fetch error:', err);
        setError(err.message);
      });
  }, []);

  // Initialize graph
  useEffect(() => {
    if (data.nodes.length > 0 && !graphRef.current) {
      const graph = ForceGraph3D()
        (document.getElementById('3d-graph')!)
        .backgroundColor('#FFFFFF')
        .graphData(data)
        .nodeThreeObject(node => {
          const group = new THREE.Group();
          // @ts-ignore
          let nodeRadius = node.group === 'page' ? 6 : 4;
          // @ts-ignore
          let nodeColor = node.group === 'page' ? '#4285F4' : '#ffa500';

          const geometry = new THREE.SphereGeometry(nodeRadius, 16, 16);
          const material = new THREE.MeshStandardMaterial({ color: nodeColor });
          const sphere = new THREE.Mesh(geometry, material);
          group.add(sphere);

          // Truncation logic
          const maxChars = 20;
          // @ts-ignore
          const originalText = node.group === 'keyword' ? `#${node.id}` : node.id;
          const displayText = originalText.length > maxChars
            ? originalText.substring(0, maxChars) + '...'
            : originalText;

          const sprite = new SpriteText(displayText); // Use displayText
          sprite.color = '#000000';
          sprite.textHeight = 4;
          sprite.position.y = nodeRadius + 5;
          group.add(sprite);

          return group;
        })
        .linkWidth(0.5)
        .linkDirectionalParticles(1)
        .linkDirectionalParticleSpeed(0.005)
        .linkDirectionalParticleWidth(2)
        .linkDirectionalParticleColor(() => '#0F9D58')
        .onNodeClick((node) => {
            // @ts-ignore
            if (node && node.group === 'page' && node.notionPageId) {
                // @ts-ignore
                setSelectedNode(node);
            }
        });

      graphRef.current = graph;

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      graph.scene().add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(50, 100, 20);
      graph.scene().add(directionalLight);

      const gridHelper = new THREE.GridHelper(1000, 50, 0x4682B4, 0xADD8E6);
      gridHelper.position.y = -150;
      graph.scene().add(gridHelper);
    }
  }, [data]);

  // Fetch page content when a page node is selected
  useEffect(() => {
    if (selectedNode) {
      setIsLoading(true);
      setPageContent('');
      setIsPanelOpen(true); // Open panel immediately
      
      fetch(`http://localhost:3000/api/page-content?pageId=${selectedNode.notionPageId}`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Failed to fetch page content');
          }
          return res.json();
        })
        .then(data => {
          setPageContent(data.markdown);
        })
        .catch(error => {
          console.error('Error fetching page content:', error);
          setPageContent('Failed to load content.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
        setIsPanelOpen(false); // Close panel
    }
  }, [selectedNode]); // Dependency array simplified

  const handleClosePanel = () => {
    setSelectedNode(null);
  };

  const relatedKeywords = selectedNode
    ? data.links
        .filter(link => link.source === selectedNode.id)
        .map(link => link.target)
    : [];

  return (
    <div>
      {error && (
        <div className="error-panel">
          <h2>Error:</h2>
          <pre>{error}</pre>
        </div>
      )}
      {databaseTitle && <h2 className="database-title">{databaseTitle}</h2>} {/* Display database title */}
      <div id="3d-graph" />

      {/* Render content-overlay based on isPanelOpen */}
      {isPanelOpen && selectedNode && (
        <div className={`content-overlay ${isPanelOpen ? 'visible' : 'hidden'}`}>
          <div className="content-panel">
            <div className="content-header">
              <h1 className="content-title">{selectedNode.id}</h1>
              <div className="controls-container">
                <div className="font-size-controls">
                  <span>A-</span>
                  <button onClick={() => setFontSize(s => Math.max(s - 1, 10))}>-</button>
                  <span className="font-size-display">{fontSize}px</span>
                  <button onClick={() => setFontSize(s => Math.min(s + 1, 24))}>+</button>
                  <span>A+</span>
                </div>
                <button onClick={handleClosePanel} className="close-button">X</button>
              </div>
            </div>

            {isLoading ? (
              <p style={{ textAlign: 'center', padding: '20px' }}>Loading...</p>
            ) : (
              <div className="content-scroll-area">
                {relatedKeywords.length > 0 && (
                  <div className="keywords-container">
                    {relatedKeywords.map(keyword => (
                      <span key={keyword} className="keyword-tag">{keyword}</span>
                    ))}
                  </div>
                )}
                <div className="content-body" style={{ fontSize: `${fontSize}px` }}>
                  <div dangerouslySetInnerHTML={{ __html: pageContent }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
