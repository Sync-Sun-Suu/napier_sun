import React, { useState } from 'react';
import { Check, Copy, Download, X } from 'lucide-react';

interface HtmlSourceModalProps {
  isOpen: boolean;
  htmlCode: string;
  onClose: () => void;
  onDownloadHtml: () => void;
}

export const HtmlSourceModal: React.FC<HtmlSourceModalProps> = ({
  isOpen,
  htmlCode,
  onClose,
  onDownloadHtml,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(htmlCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy if clipboard permission restricted
      const textarea = document.createElement('textarea');
      textarea.value = htmlCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="html-modal-title"
    >
      <div className="w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 id="html-modal-title" className="text-base font-semibold text-slate-100">
              単体で動くHTML5ソースコード
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              現在のモードとスライダー設定が反映された、外部ライブラリ不要の1ファイルHTMLです。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 bg-slate-950">
          <pre className="text-xs font-mono text-slate-300 leading-relaxed whitespace-pre overflow-x-auto">
            <code>{htmlCode}</code>
          </pre>
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-slate-800 bg-slate-900">
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {htmlCode.split('\n').length} lines · UTF-8 HTML5
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>コピー完了</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>コードをコピー</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onDownloadHtml}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-sky-500 text-slate-950 hover:bg-sky-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.htmlファイルを保存</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
