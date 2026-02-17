import { useState } from 'react'

export const InputModal = ({ title = 'Input', placeholder = '', initial = '', onCancel, onSubmit }) => {
  const [value, setValue] = useState(initial)
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded w-full max-w-md">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <textarea value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} className="w-full p-2 border rounded h-32" />
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-2 border rounded">Cancel</button>
          <button onClick={() => onSubmit(value)} className="px-3 py-2 bg-blue-600 text-white rounded">OK</button>
        </div>
      </div>
    </div>
  )
}
