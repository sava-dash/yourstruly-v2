'use client'

import { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft, Sparkles, Brain, Check, RotateCcw } from 'lucide-react'
import { QUIZ_QUESTIONS, calculateResults, QuizResult } from '@/lib/personalityQuiz'

interface PersonalityQuizProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (result: QuizResult) => void
}

export default function PersonalityQuiz({ isOpen, onClose, onComplete }: PersonalityQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [showResults, setShowResults] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  const totalQuestions = QUIZ_QUESTIONS.length
  const progress = ((currentQuestion + 1) / totalQuestions) * 100
  const question = QUIZ_QUESTIONS[currentQuestion]

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentQuestion(0)
      setAnswers({})
      setShowResults(false)
      setResult(null)
    }
  }, [isOpen])

  const handleAnswer = (score: number) => {
    setIsAnimating(true)
    setAnswers(prev => ({ ...prev, [question.id]: score }))
    
    setTimeout(() => {
      if (currentQuestion < totalQuestions - 1) {
        setCurrentQuestion(prev => prev + 1)
      } else {
        const calcResult = calculateResults({ ...answers, [question.id]: score })
        setResult(calcResult)
        setShowResults(true)
      }
      setIsAnimating(false)
    }, 300)
  }

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
    }
  }

  const handleSaveResults = () => {
    if (result) {
      onComplete(result)
      onClose()
    }
  }

  const handleRetake = () => {
    setCurrentQuestion(0)
    setAnswers({})
    setShowResults(false)
    setResult(null)
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay-page">
      <div className="modal-content-page max-w-2xl p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="quiz-header">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2D5A3D] via-[#5A8A72] to-[#8DACAB]" />
          <div className="absolute inset-0 bg-[url('/patterns/topography.svg')] opacity-10" />
          <div className="relative z-10 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Brain size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Personality Discovery</h2>
                  <p className="text-white/80 text-sm">
                    {showResults ? 'Your Results' : `Question ${currentQuestion + 1} of ${totalQuestions}`}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Progress bar */}
            {!showResults && (
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!showResults ? (
            // Question view
            <div className={`transition-opacity duration-200 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
              <h3 className="text-xl font-semibold text-[#2d2d2d] mb-6 text-center">
                {question.text}
              </h3>
              
              <div className="space-y-3">
                {question.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(option.score)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 group
                      ${answers[question.id] === option.score 
                        ? 'border-[#2D5A3D] bg-[#2D5A3D]/5' 
                        : 'border-transparent bg-[#2D5A3D]/5 hover:bg-[#2D5A3D]/10 hover:border-[#2D5A3D]/30'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                        ${answers[question.id] === option.score 
                          ? 'border-[#2D5A3D] bg-[#2D5A3D]' 
                          : 'border-gray-300 group-hover:border-[#2D5A3D]/50'
                        }`}
                      >
                        {answers[question.id] === option.score && (
                          <Check size={14} className="text-white" />
                        )}
                      </div>
                      <span className="text-[#2d2d2d] font-medium">{option.text}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-4 border-t border-[#2D5A3D]/10">
                <button
                  onClick={handleBack}
                  disabled={currentQuestion === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${currentQuestion === 0 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-[#2D5A3D] hover:bg-[#2D5A3D]/10'
                    }`}
                >
                  <ChevronLeft size={18} />
                  Back
                </button>
                <span className="text-sm text-gray-400">
                  {Object.keys(answers).length} / {totalQuestions} answered
                </span>
              </div>
            </div>
          ) : (
            // Results view
            <div className="text-center">
              {/* Result badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#C4A235]/20 to-[#B8562E]/20 rounded-full mb-4">
                <Sparkles size={16} className="text-[#B8562E]" />
                <span className="text-[#B8562E] font-medium">Quiz Complete!</span>
              </div>

              {/* Personality Type */}
              <div className="mb-6">
                <h3 className="text-3xl font-bold text-[#2D5A3D] mb-2">
                  {result?.personalityType}
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  {result?.description}
                </p>
              </div>

              {/* Traits */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">Your Key Traits</h4>
                <div className="flex flex-wrap justify-center gap-2">
                  {result?.traits.map(trait => (
                    <span 
                      key={trait}
                      className="px-3 py-1.5 bg-[#2D5A3D]/10 text-[#2D5A3D] rounded-full text-sm font-medium"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>

              {/* Strengths */}
              <div className="mb-8 bg-[#2D5A3D]/5 rounded-xl p-5">
                <h4 className="text-sm font-medium text-gray-500 mb-3">Your Strengths</h4>
                <div className="flex flex-wrap justify-center gap-2">
                  {result?.strengths.map(strength => (
                    <span 
                      key={strength}
                      className="px-3 py-1.5 bg-white text-[#2D5A3D] rounded-lg text-sm border border-[#2D5A3D]/20"
                    >
                      ✦ {strength}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-center gap-3">
                <button
                  onClick={handleRetake}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
                >
                  <RotateCcw size={16} />
                  Retake Quiz
                </button>
                <button
                  onClick={handleSaveResults}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2D5A3D] text-white font-medium hover:bg-[#234A31] transition-colors"
                >
                  <Check size={16} />
                  Save to Profile
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
