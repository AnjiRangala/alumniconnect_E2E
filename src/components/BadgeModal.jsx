import React from 'react'

export const BadgeModal = ({ badge, onClose }) => {
  if (!badge) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{badge.name}</h2>
            <p className="text-sm text-gray-600 mt-1">{badge.description}</p>
          </div>
          <div>
            <button onClick={onClose} className="px-3 py-1 bg-gray-100 rounded">Close</button>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="font-semibold">Awarded</h3>
          <p className="text-sm text-gray-500">{badge.awardedAt ? new Date(badge.awardedAt).toLocaleString() : '—'}</p>
        </div>

        {badge.giverName && (
          <div className="mt-3">
            <h3 className="font-semibold">Awarded By</h3>
            <p className="text-sm text-gray-500">{badge.giverName}</p>
          </div>
        )}

        {badge.message && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <h3 className="font-semibold text-sm mb-2">💌 Message from Alumni</h3>
            <p className="text-sm text-gray-700 italic">"{badge.message}"</p>
          </div>
        )}

        {badge.source && (
          <div className="mt-3">
            <h3 className="font-semibold">Source</h3>
            <p className="text-sm text-gray-500">{badge.source}</p>
          </div>
        )}

        {badge.tasks && badge.tasks.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold">Tasks / Requirements</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-2">
              {badge.tasks.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded">Done</button>
        </div>
      </div>
    </div>
  )
}
