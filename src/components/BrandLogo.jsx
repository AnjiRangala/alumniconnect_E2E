import React from 'react'

export const BrandLogo = ({ subtitle = 'Student', onClick, className = '' }) => {
  const content = (
    <>
      <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md ring-1 ring-blue-200/70 shrink-0">
        <span className="text-white font-extrabold text-xl leading-none">A</span>
      </div>
      <div className="leading-tight text-left">
        <h1 className="font-extrabold text-slate-900 text-lg tracking-tight">AlumniConnect</h1>
        {subtitle ? <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{subtitle}</p> : null}
      </div>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-3 hover:opacity-90 ${className}`}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {content}
    </div>
  )
}
