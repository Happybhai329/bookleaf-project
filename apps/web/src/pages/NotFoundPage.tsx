import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-800 flex items-center justify-center mx-auto mb-4 border border-navy-100">
          <FileQuestion className="w-6 h-6" />
        </div>

        <h1 className="text-3xl font-extrabold text-navy-950 tracking-tight mb-2">
          404
        </h1>
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          Page Not Found
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          The publication page or support resource you are looking for does not exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="btn-primary py-2.5 px-4 text-xs font-semibold flex items-center justify-center"
          >
            <Home className="w-4 h-4 mr-2" />
            Return to Dashboard
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="btn-secondary py-2.5 px-4 text-xs font-semibold flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
