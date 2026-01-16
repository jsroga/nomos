import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'

const apiKey = 'msy_wa766jzpeGonXkRc0XaMq6TlgVio9Vo0qkId'
const imageUrl = '/projects/01c5deda-c654-4576-89f9-860ff545f2dd/assets/asset_1764678179683.png'
const filePath = path.join(process.cwd(), 'public', imageUrl)

async function run() {
  console.log('Reading file:', filePath)
  if (!fs.existsSync(filePath)) {
    console.error('File not found')
    return
  }

  const fileBuffer = fs.readFileSync(filePath)
  const base64 = fileBuffer.toString('base64')
  const mimeType = 'image/png'
  const finalImageUrl = `data:${mimeType};base64,${base64}`

  console.log('Image size (base64):', finalImageUrl.length)

  console.log('Creating task...')
  const createResponse = await fetch('https://api.meshy.ai/v1/image-to-3d', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: finalImageUrl,
      enable_pbr: true,
    }),
  })

  if (!createResponse.ok) {
    const err = await createResponse.json()
    console.error('Create failed:', err)
    return
  }

  const { result: taskId } = await createResponse.json()
  console.log('Task ID:', taskId)

  let status = 'PENDING'
  let attempts = 0
  const maxAttempts = 60

  while (status !== 'SUCCEEDED' && status !== 'FAILED' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000))

    const statusResponse = await fetch(`https://api.meshy.ai/v1/image-to-3d/${taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!statusResponse.ok) {
      console.error('Status check failed')
      break
    }

    const result = await statusResponse.json()
    status = result.status
    console.log(`Attempt ${attempts + 1}: Status = ${status}, Progress = ${result.progress}%`)
    attempts++
  }

  if (status === 'SUCCEEDED') {
    console.log('Success!')
  } else {
    console.log('Failed or Timed Out. Final status:', status)
  }
}

run().catch(console.error)
