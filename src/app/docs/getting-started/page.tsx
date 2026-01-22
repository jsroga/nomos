'use client'

import ReactMarkdown from 'react-markdown'
import { motion } from 'framer-motion'

const DEFAULT_CONTENT = `
# Getting Started

Welcome to the **World Building Toolkit** (KUR SYSTEM v1). This guide will help you get up and running with our suite of AI-powered creative tools.

## Prerequisites

- **Node.js 18+** 
- **OpenAI API Key** (for storyteller and loop designer)
- **Anthropic API Key** (optional, for enhanced reasoning)
- **Three.js** compatible browser

## Quick Start

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/world-building-kit/tilemap.git
   cd tilemap
   \`\`\`

2. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up Environment Variables**
   Create a \`.env.local\` file with your API keys.

4. **Run Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`

## Key Modules

- **Storyteller**: Generate deep lore, characters, and narrative beats.
- **Interior Designer**: Procedural room and terrain generation.
- **World Gen**: Infinite tile-able 3D environments.
- **Loop Creator**: Design and analyze game retention loops.

---

> [!TIP]
> Use the [API Reference](/docs) to see how to integrate these modules into your own pipeline.
`

export default function GettingStartedPage() {
  return (
    <div className="prose prose-invert prose-primary max-w-none">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h1 className="text-4xl font-black uppercase tracking-tighter font-syne mb-8 text-white">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-2xl font-bold uppercase tracking-tight font-syne mt-12 mb-4 text-primary">
                {children}
              </h2>
            ),
            code: ({ node, inline, className, children, ...props }) => (
              <code
                className={`${className} bg-white/5 px-1.5 py-0.5 rounded font-mono text-sm`}
                {...props}
              >
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <pre className="bg-[#0a0a0a] border border-white/5 p-6 rounded-xl overflow-x-auto my-6 font-mono text-sm">
                {children}
              </pre>
            ),
          }}
        >
          {DEFAULT_CONTENT}
        </ReactMarkdown>
      </motion.div>
    </div>
  )
}
