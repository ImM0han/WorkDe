export function getFriendlyErrorMessage(err: any): string {
  const message = err.message || '';
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';

  if (message.includes('Network request failed') || message.includes('Network Error')) {
    let details = 'Network Connection Failed\n\n';
    details += `Target API: ${apiUrl || 'undefined'}\n\n`;

    if (!apiUrl) {
      details += 'Reason: EXPO_PUBLIC_API_URL environment variable is not defined.';
    } else if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
      details += "Reason: You are using 'localhost' or '127.0.0.1' on a physical device or external build, which cannot route to your computer. Use your computer's local IP (e.g., http://192.168.x.x:4000) or a publicly deployed backend URL.";
    } else if (apiUrl.startsWith('http://10.') || apiUrl.startsWith('http://192.168.') || apiUrl.startsWith('http://172.')) {
      details += "Reason: Local IP address detected. Ensure your backend server is running and your mobile device is connected to the exact same Wi-Fi network.";
    } else {
      details += 'Reason: The server at this URL could not be reached. Ensure the backend is active, port 4000 is open, and there is no firewall blocking the connection.';
    }
    return details;
  }
  return message;
}
