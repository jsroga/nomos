
const REFERENCE_REGEX = /\[([^\]]+)\]\[([a-z]+-[a-zA-Z0-9-]+)\]/g

const text = 'A close ally of Elara is revealed to be working with [The Bottlers Guild][faction-the-bottlers-guild], manipulating events to create chaos for personal gain.'

console.log('Testing text:', text)
console.log('Regex source:', REFERENCE_REGEX.source)

const matches = []
let match
while ((match = REFERENCE_REGEX.exec(text)) !== null) {
    matches.push({
        full: match[0],
        name: match[1],
        id: match[2],
        index: match.index
    })
}

console.log('Matches found:', matches.length)
console.log(JSON.stringify(matches, null, 2))

if (matches.length > 0) {
    console.log('✅ Regex MATCHES the text.')
} else {
    console.log('❌ Regex DOES NOT match the text.')
}
