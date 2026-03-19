import React from 'react';
import { Button } from '../ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button onClick={() => window.history.back()} variant="outline" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Terms of Service</h1>
          <p className="text-lg text-gray-600">Hotel Porec • Poreč, Croatia</p>
        </div>

        {/* Content Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-lg">
          <div className="prose prose-lg max-w-none">
            {/* Coming Soon Message */}
            <div className="mb-8 rounded-lg border-2 border-blue-300 bg-blue-50 p-6">
              <div className="text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-200">
                  <svg
                    className="h-8 w-8 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h2 className="mb-2 text-2xl font-bold text-gray-900">Coming Soon</h2>
                <p className="mb-4 text-gray-600">
                  Our Terms of Service are currently being prepared and will be available shortly.
                </p>
                <p className="text-sm text-gray-500">
                  Last updated:{' '}
                  {new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Placeholder Sections */}
            <section className="mb-8">
              <h2 className="mb-4 text-2xl font-bold text-gray-900">1. Introduction</h2>
              <div className="h-12 animate-pulse rounded bg-gray-100"></div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-2xl font-bold text-gray-900">2. Use License</h2>
              <div className="space-y-3">
                <div className="h-4 animate-pulse rounded bg-gray-100"></div>
                <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100"></div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-2xl font-bold text-gray-900">3. Disclaimer</h2>
              <div className="space-y-3">
                <div className="h-4 animate-pulse rounded bg-gray-100"></div>
                <div className="h-4 w-4/6 animate-pulse rounded bg-gray-100"></div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-2xl font-bold text-gray-900">4. Limitations</h2>
              <div className="space-y-3">
                <div className="h-4 animate-pulse rounded bg-gray-100"></div>
                <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100"></div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-2xl font-bold text-gray-900">5. Accuracy of Materials</h2>
              <div className="space-y-3">
                <div className="h-4 animate-pulse rounded bg-gray-100"></div>
                <div className="h-4 w-4/6 animate-pulse rounded bg-gray-100"></div>
              </div>
            </section>
          </div>

          {/* Footer Note */}
          <div className="mt-12 border-t border-gray-200 pt-8">
            <p className="text-sm text-gray-500">
              For questions about our Terms of Service, please contact us at{' '}
              <a
                href="mailto:hotelporec@pu.t-com.hr"
                className="text-blue-600 underline hover:text-blue-700"
              >
                hotelporec@pu.t-com.hr
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
