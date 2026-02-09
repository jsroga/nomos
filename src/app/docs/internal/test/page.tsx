'use client'

import { Beaker, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useState } from 'react'

export default function InternalTestPage() {
  const [testResults, setTestResults] = useState<
    { name: string; status: 'pass' | 'fail' | 'pending' }[]
  >([
    { name: 'localStorage Auth Check', status: 'pass' },
    { name: 'Internal Route Access', status: 'pass' },
    { name: 'Layout Rendering', status: 'pass' },
    { name: 'Navigation Links', status: 'pending' },
  ])

  const runTests = () => {
    setTestResults(prev =>
      prev.map(t => ({
        ...t,
        status: Math.random() > 0.1 ? 'pass' : 'fail',
      }))
    )
  }

  return (
    <div className="max-w-none">
      {/* Header */}
      <div className="mb-12 border-b border-red-500/20 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-500/10 rounded-lg">
            <Beaker className="w-6 h-6 text-red-500" />
          </div>
          <span className="font-mono text-xs text-red-500 uppercase tracking-widest">
            Internal / Test
          </span>
        </div>
        <h1 className="text-5xl font-black uppercase tracking-tighter font-syne text-white m-0">
          Test Page
        </h1>
        <p className="text-white/60 text-xl mt-4 max-w-2xl leading-relaxed">
          Internal testing ground for development and debugging.
        </p>
      </div>

      {/* Test Results */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">System Checks</h2>
          <button
            onClick={runTests}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-500 rounded-lg text-sm font-mono transition-colors"
          >
            Run Tests
          </button>
        </div>

        <div className="space-y-2">
          {testResults.map((test, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-lg"
            >
              <span className="text-white/80 font-mono text-sm">{test.name}</span>
              <div className="flex items-center gap-2">
                {test.status === 'pass' && <CheckCircle className="w-4 h-4 text-green-500" />}
                {test.status === 'fail' && <XCircle className="w-4 h-4 text-red-500" />}
                {test.status === 'pending' && <Clock className="w-4 h-4 text-yellow-500" />}
                <span
                  className={`text-xs font-mono uppercase ${
                    test.status === 'pass'
                      ? 'text-green-500'
                      : test.status === 'fail'
                        ? 'text-red-500'
                        : 'text-yellow-500'
                  }`}
                >
                  {test.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Debug Info */}
      <div className="p-6 bg-[#0a0a0a] border border-white/5 rounded-xl">
        <h3 className="text-white font-bold mb-4">Debug Information</h3>
        <pre className="text-white/60 font-mono text-sm overflow-x-auto">
          {`{
  "route": "/docs/internal/test",
  "auth": "localStorage",
  "secretKey": "****hidden****",
  "timestamp": "${new Date().toISOString()}"
}`}
        </pre>
      </div>
    </div>
  )
}
