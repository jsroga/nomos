/**
 * COORDINATE SYSTEM TEST SUITE
 *
 * Model:
 * - Container: 1000x1000
 * - Center: 500, 500
 * - Viewport: x=100, y=50, scale=2
 *
 * Expected Transformation:
 * ScreenPoint = Center + Viewport + (WorldPoint * Scale)
 *
 * Test Case 1: World Origin (0,0)
 * Screen = 500 + 100 + (0 * 2) = 600
 * ScreenX = 600
 * ScreenY = 500 + 50 + (0 * 2) = 550
 *
 * Test Case 2: World Point (100, 100)
 * ScreenX = 500 + 100 + (100 * 2) = 800
 * ScreenY = 500 + 50 + (100 * 2) = 750
 */

function testCoordinates() {
  const containerWidth = 1000
  const containerHeight = 1000
  const viewport = { x: 100, y: 50, scale: 2 }

  const centerX = containerWidth / 2
  const centerY = containerHeight / 2

  // The logic currently in RepaintCanvas.tsx
  const screenToWorld = (screenX, screenY) => {
    const worldX = (screenX - centerX - viewport.x) / viewport.scale
    const worldY = (screenY - centerY - viewport.y) / viewport.scale
    return { x: worldX, y: worldY }
  }

  const worldToScreen = (worldX, worldY) => {
    const screenX = centerX + viewport.x + worldX * viewport.scale
    const screenY = centerY + viewport.y + worldY * viewport.scale
    return { x: screenX, y: screenY }
  }

  console.log('--- Testing Coordinate System ---')

  // Test 1: World Origin to Screen
  const originScreen = worldToScreen(0, 0)
  console.log(`World(0,0) -> Screen(${originScreen.x}, ${originScreen.y})`)
  if (originScreen.x !== 600 || originScreen.y !== 550) {
    console.error('FAIL: World Origin to Screen incorrect')
  } else {
    console.log('PASS: World Origin to Screen')
  }

  // Test 2: Screen back to World Origin
  const originWorld = screenToWorld(600, 550)
  console.log(`Screen(600,550) -> World(${originWorld.x}, ${originWorld.y})`)
  if (originWorld.x !== 0 || originWorld.y !== 0) {
    console.error('FAIL: Screen to World Origin incorrect')
  } else {
    console.log('PASS: Screen to World Origin')
  }

  // Test 3: Point (100, 100)
  const pScreen = worldToScreen(100, 100)
  console.log(`World(100,100) -> Screen(${pScreen.x}, ${pScreen.y})`)
  if (pScreen.x !== 800 || pScreen.y !== 750) {
    console.error('FAIL: World Point to Screen incorrect')
  } else {
    console.log('PASS: World Point to Screen')
  }

  // Test 4: Inverse
  const pWorld = screenToWorld(800, 750)
  console.log(`Screen(800,750) -> World(${pWorld.x}, ${pWorld.y})`)
  if (pWorld.x !== 100 || pWorld.y !== 100) {
    console.error('FAIL: Screen to World Point incorrect')
  } else {
    console.log('PASS: Screen to World Point')
  }
}

testCoordinates()



