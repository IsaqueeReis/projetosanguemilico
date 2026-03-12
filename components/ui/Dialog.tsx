import React, { useState, useEffect } from 'react';
import { AlertTriangle, HelpCircle, CheckCircle, X } from 'lucide-react';

export type DialogType = 'alert' | 'confirm' | 'prompt' | 'success' | 'error';

export interface DialogProps {
    isOpen: boolean;
    type: DialogType;
    title: string;
    message: string;
    onConfirm?: (value?: string) => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    inputPlaceholder?: string;
}

export const Dialog: React.FC<DialogProps> = ({ 
    isOpen, 
    type, 
    title, 
    message, 
    onConfirm, 
    onCancel, 
    confirmText = 'Confirmar', 
    cancelText = 'Cancelar',
    inputPlaceholder = ''
}) => {
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        if (isOpen) setInputValue('');
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm(type === 'prompt' ? inputValue : undefined);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleConfirm();
        if (e.key === 'Escape') onCancel();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        {(type === 'alert' || type === 'error') && <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400"><AlertTriangle size={24} /></div>}
                        {(type === 'confirm' || type === 'prompt') && <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600 dark:text-yellow-400"><HelpCircle size={24} /></div>}
                        {type === 'success' && <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400"><CheckCircle size={24} /></div>}
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{title}</h3>
                    </div>
                    
                    <p className="text-zinc-600 dark:text-zinc-300 mb-6 leading-relaxed whitespace-pre-wrap">{message}</p>

                    {type === 'prompt' && (
                        <input 
                            type="text" 
                            value={inputValue} 
                            onChange={e => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={inputPlaceholder}
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 mb-6 outline-none focus:border-blue-500 dark:text-white"
                            autoFocus
                        />
                    )}

                    <div className="flex justify-end gap-3">
                        {(type === 'confirm' || type === 'prompt') && (
                            <button 
                                onClick={onCancel}
                                className="px-4 py-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium transition-colors"
                            >
                                {cancelText}
                            </button>
                        )}
                        <button 
                            onClick={handleConfirm}
                            className={`px-4 py-2 rounded-lg text-white font-bold shadow-lg transition-colors ${
                                type === 'error' ? 'bg-red-600 hover:bg-red-700 shadow-red-900/20' :
                                type === 'success' ? 'bg-green-600 hover:bg-green-700 shadow-green-900/20' :
                                'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20'
                            }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
