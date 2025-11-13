'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

export default function LessonView() {
  const params = useParams()
  const router = useRouter()
  const [lesson, setLesson] = useState<any>(null)
  const [currentSection, setCurrentSection] = useState(0)
  const [code, setCode] = useState('')
  const [codeOutput, setCodeOutput] = useState('')
  const [quizAnswers, setQuizAnswers] = useState<{[key: number]: number}>({})
  const [showExplanations, setShowExplanations] = useState<{[key: number]: boolean}>({})
  const diagramRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/auth')
      return
    }
    fetchLesson(token)
  }, [params.id, router])

  const fetchLesson = async (token: string) => {
    try {
      const res = await fetch('http://localhost:3001/api/lessons', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const lessons = await res.json()
      const found = lessons.find((l: any) => l.id === params.id)
      setLesson(found)

      const codeSection = found?.sections?.find((s: any) => s.type === 'code')
      if (codeSection) setCode(codeSection.content || '')
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (!lesson?.sections?.[currentSection]) return
    const section = lesson.sections[currentSection]

    if (section.type === 'visual' && section.diagram && diagramRef.current) {
      renderMermaid(section.diagram)
    }
  }, [currentSection, lesson])

  const renderMermaid = async (diagram: string) => {
    if (!diagramRef.current) return
    
    try {
      const mermaid = (await import('mermaid')).default
      mermaid.initialize({ startOnLoad: false, theme: 'dark' })
      const { svg } = await mermaid.render('mermaid-diagram', diagram)
      if (diagramRef.current) {
        diagramRef.current.innerHTML = svg
      }
    } catch (err) {
      console.error('Mermaid error:', err)
      if (diagramRef.current) {
        diagramRef.current.innerHTML = `<p class="text-red-400">Diagram error: ${err}</p>`
      }
    }
  }

  const runCode = async () => {
    setCodeOutput('Running...')
    try {
      const pyodide = await (window as any).loadPyodide()
      
      pyodide.runPython(`
        import sys
        from io import StringIO
        sys.stdout = StringIO()
      `)

      pyodide.runPython(code)
      
      const output = pyodide.runPython('sys.stdout.getvalue()')
      setCodeOutput(output || 'Code executed successfully (no output)')
    } catch (err: any) {
      setCodeOutput(`Error: ${err.message}`)
    }
  }

  const handleQuizAnswer = (qIdx: number, optIdx: number) => {
    setQuizAnswers(prev => ({ ...prev, [qIdx]: optIdx }))
    setShowExplanations(prev => ({ ...prev, [qIdx]: true }))
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--gray1)]">
        <p className="text-[var(--gray11)]">Loading lesson...</p>
      </div>
    )
  }

  const section = lesson.sections?.[currentSection]
  if (!section) return null

  const renderSection = () => {
    switch (section.type) {
      case 'text':
        return (
          <div className="text-[var(--gray12)] leading-relaxed whitespace-pre-wrap text-lg">
            {section.content}
          </div>
        )

      case 'visual':
        return (
          <div className="space-y-6">
            <div
              ref={diagramRef}
              className="bg-[var(--gray3)] border border-[var(--gray6)] rounded-lg p-8 min-h-[300px] flex items-center justify-center overflow-auto"
            />
            {section.explanation && (
              <div className="text-[var(--gray11)] leading-relaxed whitespace-pre-wrap">
                {section.explanation}
              </div>
            )}
          </div>
        )

      case 'code':
        return (
          <div className="space-y-4">
            {section.explanation && (
              <div className="p-4 bg-[var(--gray3)] border border-[var(--gray6)] rounded-lg">
                <p className="font-medium text-[var(--gray12)] mb-2">About this code:</p>
                <p className="text-[var(--gray11)] whitespace-pre-wrap">{section.explanation}</p>
              </div>
            )}

            <div className="border border-[var(--gray6)] rounded-lg overflow-hidden">
              <MonacoEditor
                height="400px"
                language={section.language || 'python'}
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={runCode}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
              >
                ▶ Run Code
              </button>
            </div>

            {codeOutput && (
              <div className="p-4 bg-[var(--gray3)] border border-[var(--gray6)] rounded-lg">
                <p className="font-medium text-[var(--gray12)] mb-2">Output:</p>
                <pre className="text-[var(--gray11)] whitespace-pre-wrap font-mono text-sm">
                  {codeOutput}
                </pre>
              </div>
            )}

            {section.expectedOutput && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="font-medium text-blue-400 mb-2">Expected Output:</p>
                <pre className="text-[var(--gray11)] whitespace-pre-wrap font-mono text-sm">
                  {section.expectedOutput}
                </pre>
              </div>
            )}
          </div>
        )

      case 'quiz':
        return (
          <div className="space-y-8">
            {section.questions?.map((q: any, qIdx: number) => {
              const selected = quizAnswers[qIdx]
              const showExp = showExplanations[qIdx]
              const isCorrect = selected === q.correct

              return (
                <div key={qIdx} className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--gray3)] flex items-center justify-center text-[var(--gray12)] font-medium">
                      {qIdx + 1}
                    </div>
                    <p className="text-lg text-[var(--gray12)] font-medium flex-1">{q.question}</p>
                  </div>

                  <div className="space-y-2 ml-11">
                    {q.options?.map((opt: string, optIdx: number) => {
                      const isSelected = selected === optIdx
                      const isCorrectOpt = optIdx === q.correct
                      
                      let bg = 'bg-[var(--gray3)] hover:bg-[var(--gray4)]'
                      let border = 'border-[var(--gray6)]'
                      let text = 'text-[var(--gray12)]'

                      if (showExp) {
                        if (isCorrectOpt) {
                          bg = 'bg-green-500/20'
                          border = 'border-green-500'
                          text = 'text-green-400'
                        } else if (isSelected) {
                          bg = 'bg-red-500/20'
                          border = 'border-red-500'
                          text = 'text-red-400'
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleQuizAnswer(qIdx, optIdx)}
                          disabled={showExp}
                          className={`block w-full text-left px-4 py-3 ${bg} border ${border} rounded-lg ${text} transition disabled:cursor-default`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{String.fromCharCode(65 + optIdx)}.</span>
                            <span>{opt}</span>
                            {showExp && isCorrectOpt && <span className="ml-auto">✓</span>}
                            {showExp && isSelected && !isCorrectOpt && <span className="ml-auto">✗</span>}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {showExp && (
                    <div className={`ml-11 p-4 rounded-lg border ${isCorrect ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                      <p className={`font-medium mb-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        {isCorrect ? '✓ Correct!' : '✗ Not quite'}
                      </p>
                      <p className="text-[var(--gray11)] text-sm whitespace-pre-wrap">{q.explanation}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )

      case 'project':
        return (
          <div className="space-y-6">
            <div className="text-[var(--gray12)] leading-relaxed whitespace-pre-wrap">
              {section.content}
            </div>

            {section.requirements?.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-[var(--gray12)] mb-3">Requirements:</h3>
                <ul className="space-y-2">
                  {section.requirements.map((req: string, idx: number) => (
                    <li key={idx} className="flex gap-3">
                      <span className="text-[var(--gray11)]">□</span>
                      <span className="text-[var(--gray11)]">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {section.hints?.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-[var(--gray12)] mb-3">Hints:</h3>
                {section.hints.map((hint: string, idx: number) => (
                  <details key={idx} className="group mb-2">
                    <summary className="cursor-pointer p-3 bg-[var(--gray3)] hover:bg-[var(--gray4)] rounded-lg text-[var(--gray11)] transition">
                      💡 Hint {idx + 1}
                    </summary>
                    <div className="mt-2 p-3 text-[var(--gray11)] text-sm">{hint}</div>
                  </details>
                ))}
              </div>
            )}

            {section.starterCode && (
              <div className="border border-[var(--gray6)] rounded-lg overflow-hidden">
                <div className="bg-[var(--gray3)] px-4 py-2 border-b border-[var(--gray6)]">
                  <p className="text-sm text-[var(--gray11)]">Starter Code</p>
                </div>
                <MonacoEditor
                  height="300px"
                  language="python"
                  theme="vs-dark"
                  defaultValue={section.starterCode}
                  options={{ minimap: { enabled: false }, fontSize: 14 }}
                />
              </div>
            )}
          </div>
        )

      default:
        return <p className="text-[var(--gray11)]">Unknown section type</p>
    }
  }

  return (
    <div className="min-h-screen bg-[var(--gray1)] p-8">
      <script src="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js"></script>
      
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <Link href="/lessons" className="text-[var(--gray11)] hover:text-[var(--gray12)] mb-4 inline-block">
            ← Back to Lessons
          </Link>
          <h1 className="text-4xl font-bold text-[var(--gray12)]">
            {lesson.title || lesson.topic}
          </h1>
          {lesson.description && (
            <p className="text-[var(--gray11)] mt-2">{lesson.description}</p>
          )}
        </div>

        <div className="flex gap-8">
          <div className="w-72 flex-shrink-0 space-y-2 sticky top-8 self-start">
            <p className="text-xs font-medium text-[var(--gray11)] uppercase mb-4">Outline</p>
            {lesson.sections?.map((s: any, idx: number) => (
              <button
                key={idx}
                onClick={() => setCurrentSection(idx)}
                className={`w-full text-left px-4 py-3 rounded-lg transition ${
                  idx === currentSection
                    ? 'bg-[var(--gray3)] text-[var(--gray12)] border border-[var(--gray6)]'
                    : 'text-[var(--gray11)] hover:bg-[var(--gray2)]'
                }`}
              >
                <div className="flex gap-3">
                  <span className="text-xs">{idx + 1}</span>
                  <span className="text-sm">{s.title}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex-1 bg-[var(--gray2)] border border-[var(--gray6)] rounded-xl p-8">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-[var(--gray12)]">{section.title}</h2>
            </div>

            {renderSection()}

            <div className="flex justify-between mt-12 pt-8 border-t border-[var(--gray6)]">
              <button
                onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
                className="px-6 py-3 bg-[var(--gray3)] hover:bg-[var(--gray4)] text-[var(--gray12)] rounded-lg transition disabled:opacity-30"
              >
                ← Previous
              </button>
              <span className="text-[var(--gray11)] self-center">
                {currentSection + 1} / {lesson.sections?.length || 0}
              </span>
              <button
                onClick={() => setCurrentSection(Math.min((lesson.sections?.length || 1) - 1, currentSection + 1))}
                disabled={currentSection === (lesson.sections?.length || 1) - 1}
                className="px-6 py-3 bg-[var(--gray12)] hover:bg-[var(--gray11)] text-[var(--gray1)] rounded-lg transition disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
