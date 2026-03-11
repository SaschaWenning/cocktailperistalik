// Test-Skript für alle API-Endpunkte
const BASE_URL = "http://localhost:3000"

async function testAPI(endpoint, method = "GET", body = null) {
  try {
    console.log(`\n🧪 Testing ${method} ${endpoint}`)

    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options)
    const data = await response.json()

    if (response.ok) {
      console.log(`✅ ${endpoint} - Status: ${response.status}`)
      console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 200) + "...")
    } else {
      console.log(`❌ ${endpoint} - Status: ${response.status}`)
      console.log(`   Error:`, data)
    }

    return { success: response.ok, data, status: response.status }
  } catch (error) {
    console.log(`💥 ${endpoint} - Network Error:`, error.message)
    return { success: false, error: error.message }
  }
}

async function runAllTests() {
  console.log("🚀 Starting API Tests...\n")

  const results = []

  // Test 1: Tab Config API
  console.log("=== TAB CONFIG API ===")
  results.push(await testAPI("/api/tab-config"))

  // Test 2: Pump Config API
  console.log("\n=== PUMP CONFIG API ===")
  results.push(await testAPI("/api/pump-config"))

  // Test 3: Cocktails API
  console.log("\n=== COCKTAILS API ===")
  results.push(await testAPI("/api/cocktails"))

  // Test 4: Ingredient Levels API
  console.log("\n=== INGREDIENT LEVELS API ===")
  results.push(await testAPI("/api/ingredient-levels"))

  // Test 5: Hidden Cocktails API
  console.log("\n=== HIDDEN COCKTAILS API ===")
  results.push(await testAPI("/api/hidden-cocktails"))

  // Test 6: Ingredients API
  console.log("\n=== INGREDIENTS API ===")
  results.push(await testAPI("/api/ingredients"))

  // Test 7: Test POST endpoints with sample data
  console.log("\n=== POST ENDPOINTS ===")

  // Test ingredient levels update
  results.push(
    await testAPI("/api/ingredient-levels/update", "POST", {
      ingredients: [{ pumpId: 1, amount: 10 }],
    }),
  )

  // Test hidden cocktails update
  results.push(
    await testAPI("/api/hidden-cocktails", "POST", {
      hiddenCocktails: ["test-cocktail"],
    }),
  )

  // Summary
  console.log("\n=== TEST SUMMARY ===")
  const successful = results.filter((r) => r.success).length
  const total = results.length

  console.log(`✅ Successful: ${successful}/${total}`)
  console.log(`❌ Failed: ${total - successful}/${total}`)

  if (successful === total) {
    console.log("\n🎉 All API endpoints are working correctly!")
  } else {
    console.log("\n⚠️  Some API endpoints need attention.")
  }

  return results
}

// Run the tests
runAllTests().catch(console.error)
