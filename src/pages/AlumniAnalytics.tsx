import React from 'react'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'

interface AlumniAnalyticsProps {
  onNavigate: (page: string) => void
}

export const AlumniAnalytics = ({ onNavigate }: AlumniAnalyticsProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar onNavigate={onNavigate} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="bg-white p-6 rounded shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Analytics & Reports</h1>
              <p className="text-gray-600">Overview of mentorship metrics and engagement.</p>
            </div>
            <div>
              <button onClick={() => onNavigate('alumni-dashboard')} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200">← Back to Dashboard</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-500">Mentorship Matches</p>
              <p className="text-3xl font-bold">24</p>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-500">Sessions Conducted</p>
              <p className="text-3xl font-bold">68</p>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-500">Avg. Rating</p>
              <p className="text-3xl font-bold">4.8</p>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-gray-600">More detailed charts and CSV exports can be added here.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
