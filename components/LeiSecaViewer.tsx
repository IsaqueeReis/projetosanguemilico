import React, { useState, useEffect, useRef } from 'react';
import { Material } from '../types';
import { userProgressRepo } from '../services/repository';
import { X, Save, Download, Bold, Italic, Underline, List, ListOrdered, Type, Highlighter, Palette, AlignLeft, AlignCenter, AlignRight, Undo, Redo, ExternalLink } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface LeiSecaViewerProps {
  material: Material;
  userId: string;
  onClose: () => void;
}

export const LeiSecaViewer: React.FC<LeiSecaViewerProps> = ({ material, userId, onClose }) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadNotes = async () => {
      try {
        const savedNotes = await userProgressRepo.get(userId, `notes_${material.id}`, '');
        setNotes(savedNotes);
        if (editorRef.current) {
          editorRef.current.innerHTML = savedNotes;
        }
      } catch (error) {
        console.error("Erro ao carregar anotações:", error);
      } finally {
        setLoading(false);
      }
    };
    loadNotes();
  }, [material.id, userId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await userProgressRepo.set(userId, `notes_${material.id}`, notes);
    } catch (error) {
      console.error("Erro ao salvar anotações:", error);
      alert("Erro ao salvar anotações.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!editorRef.current) return;

    const doc = new jsPDF();
    const content = editorRef.current;

    // Clone to capture full height
    const clone = content.cloneNode(true) as HTMLElement;
    clone.style.height = 'auto';
    clone.style.overflow = 'visible';
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    clone.style.width = `${content.offsetWidth}px`;
    clone.style.background = 'white';
    clone.style.color = 'black';
    document.body.appendChild(clone);

    try {
      const canvas = await html2canvas(clone, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const imgProps = doc.getImageProperties(imgData);
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      doc.setFontSize(18);
      doc.text(`Anotações: ${material.title}`, 10, 10);
      
      // Simple pagination logic could be added here, but for now we scale to fit or add as is
      // If height > page height, we might need multiple pages. 
      // For simplicity in this iteration, we add the image.
      doc.addImage(imgData, 'PNG', 0, 20, pdfWidth, pdfHeight);
      
      doc.save(`Anotacoes_${material.title}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF.");
    } finally {
      document.body.removeChild(clone);
    }
  };

  // Editor Commands
  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setNotes(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <span className="bg-yellow-600/20 text-yellow-500 px-2 py-1 rounded text-xs border border-yellow-600/50">LEI SECA</span>
          {material.title}
        </h2>
        <button onClick={onClose} className="text-zinc-400 hover:text-white p-2 rounded-full hover:bg-zinc-800 transition">
          <X size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: PDF/Link Viewer */}
        <div className="flex-[2] bg-zinc-950 border-r border-zinc-800 relative flex flex-col">
          {material.pdfUrl && (
            <div className="bg-zinc-900 border-b border-zinc-800 p-2 flex justify-end">
              <a 
                href={material.pdfUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition"
              >
                <ExternalLink size={14} /> Abrir em nova aba
              </a>
            </div>
          )}
          {material.pdfUrl ? (
            <iframe 
              src={material.pdfUrl} 
              className="w-full h-full border-none bg-white" 
              title="Visualizador de Lei"
            />
          ) : (
            <div className="p-8 prose prose-invert max-w-none overflow-y-auto h-full" dangerouslySetInnerHTML={{ __html: material.contentHtml }} />
          )}
        </div>

        {/* Right: Notes Panel */}
        <div className="flex-1 bg-zinc-900 flex flex-col min-w-[400px] border-l border-zinc-800 shadow-2xl">
          {/* Toolbar */}
          <div className="p-2 border-b border-zinc-800 bg-zinc-800/50 flex flex-wrap gap-1 items-center">
            <button onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded" title="Negrito"><Bold size={16}/></button>
            <button onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded" title="Itálico"><Italic size={16}/></button>
            <button onMouseDown={(e) => { e.preventDefault(); execCmd('underline'); }} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded" title="Sublinhado"><Underline size={16}/></button>
            <div className="w-px h-6 bg-zinc-700 mx-1 self-center"></div>
            <button onMouseDown={(e) => { e.preventDefault(); execCmd('insertUnorderedList'); }} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded" title="Lista"><List size={16}/></button>
            <button onMouseDown={(e) => { e.preventDefault(); execCmd('insertOrderedList'); }} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded" title="Lista Numerada"><ListOrdered size={16}/></button>
            <div className="w-px h-6 bg-zinc-700 mx-1 self-center"></div>
            <button onMouseDown={(e) => { e.preventDefault(); execCmd('justifyLeft'); }} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded" title="Alinhar Esquerda"><AlignLeft size={16}/></button>
            <button onMouseDown={(e) => { e.preventDefault(); execCmd('justifyCenter'); }} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded" title="Centralizar"><AlignCenter size={16}/></button>
            <div className="w-px h-6 bg-zinc-700 mx-1 self-center"></div>
            
            {/* Color Pickers */}
            <div className="flex items-center gap-1 mx-1">
              <div className="relative group">
                <Palette size={16} className="text-zinc-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"/>
                <input 
                  type="color" 
                  onChange={(e) => execCmd('foreColor', e.target.value)}
                  className="w-8 h-8 opacity-0 cursor-pointer absolute inset-0"
                  title="Cor do Texto"
                />
                <div className="w-8 h-8 rounded bg-zinc-700 flex items-center justify-center hover:bg-zinc-600 cursor-pointer">
                   <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-500 to-blue-500"></div>
                </div>
              </div>

              <div className="relative group">
                <Highlighter size={16} className="text-zinc-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"/>
                <input 
                  type="color" 
                  onChange={(e) => execCmd('hiliteColor', e.target.value)}
                  className="w-8 h-8 opacity-0 cursor-pointer absolute inset-0"
                  title="Marca-texto"
                />
                <div className="w-8 h-8 rounded bg-zinc-700 flex items-center justify-center hover:bg-zinc-600 cursor-pointer">
                   <div className="w-4 h-4 rounded-sm bg-yellow-200 border border-zinc-500"></div>
                </div>
              </div>
            </div>

            <div className="w-px h-6 bg-zinc-700 mx-1 self-center"></div>
            
            {/* Font Size */}
            <div className="flex items-center gap-1">
              <Type size={16} className="text-zinc-400"/>
              <select 
                onChange={(e) => execCmd('fontSize', e.target.value)} 
                className="bg-zinc-700 text-white text-xs rounded p-1 outline-none border border-zinc-600"
                defaultValue="3"
              >
                <option value="1">1 (Min)</option>
                <option value="2">2 (Peq)</option>
                <option value="3">3 (Normal)</option>
                <option value="4">4 (Méd)</option>
                <option value="5">5 (Grd)</option>
                <option value="6">6 (XG)</option>
                <option value="7">7 (Max)</option>
              </select>
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 relative bg-white text-zinc-900 overflow-hidden">
             {loading && <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div></div>}
             <div 
                ref={editorRef}
                className="w-full h-full p-6 outline-none overflow-y-auto prose max-w-none"
                contentEditable
                onInput={(e) => setNotes(e.currentTarget.innerHTML)}
                style={{ minHeight: '100%' }}
                placeholder="Faça suas anotações aqui..."
             />
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex justify-between items-center">
            <span className="text-xs text-zinc-500 italic">
              {saving ? 'Salvando...' : 'As alterações são salvas automaticamente ao clicar em Salvar.'}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-bold transition"
                title="Baixar PDF"
              >
                <Download size={16} /> PDF
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition shadow-lg shadow-green-900/20 disabled:opacity-50"
              >
                <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
