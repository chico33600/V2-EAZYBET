import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ODDS_API_KEY;

    console.log('🔑 [TEST] Checking API key configuration...');

    if (!apiKey) {
      console.error('❌ [TEST] ODDS_API_KEY not found in environment');
      return Response.json({
        success: false,
        error: 'ODDS_API_KEY not configured',
      }, { status: 500 });
    }

    console.log('✅ [TEST] API key found:', apiKey.substring(0, 8) + '...');

    const testUrl = `https://api.the-odds-api.com/v4/sports/soccer_france_ligue_one/odds/?regions=eu&markets=h2h&apiKey=${apiKey}`;

    console.log('📡 [TEST] Testing URL:', testUrl.replace(apiKey, 'HIDDEN'));

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log('📊 [TEST] Response status:', response.status, response.statusText);

    const responseText = await response.text();
    console.log('📝 [TEST] Response body (first 500 chars):', responseText.substring(0, 500));

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }

    // Check for specific error cases
    if (!response.ok) {
      if (responseData && responseData.error_code === 'OUT_OF_USAGE_CREDITS') {
        console.error('❌ [TEST] API quota exceeded!');
        return Response.json({
          success: false,
          status: response.status,
          error: 'API quota exceeded',
          message: responseData.message || 'Usage quota has been reached',
          data: responseData,
        }, { status: response.status });
      }

      console.error('❌ [TEST] API call failed:', responseData);
      return Response.json({
        success: false,
        status: response.status,
        statusText: response.statusText,
        error: responseData.message || 'API call failed',
        data: responseData,
      }, { status: response.status });
    }

    console.log('✅ [TEST] API call successful!');
    console.log('📊 [TEST] Data type:', typeof responseData);
    console.log('📊 [TEST] Is array:', Array.isArray(responseData));
    console.log('📊 [TEST] Item count:', Array.isArray(responseData) ? responseData.length : 0);

    return Response.json({
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      dataType: typeof responseData,
      isArray: Array.isArray(responseData),
      itemCount: Array.isArray(responseData) ? responseData.length : 0,
    });

  } catch (error: any) {
    console.error('❌ [TEST] Fatal error:', error);
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
