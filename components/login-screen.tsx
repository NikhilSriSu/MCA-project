"use client";

import { useState } from "react";
import { roleKeyToRole, type RoleKey } from "@/lib/role-routes";

const roleOptions: RoleKey[] = ["admin", "analyst", "officer"];

export default function LoginScreen() {
  const [roleKey, setRoleKey] = useState<RoleKey>("admin");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem("fraud-demo-role", roleKey);
    window.location.href = `/${roleKey}`;
  }

  return (
    <div className="app-shell">
      <section className="login-screen">
        <div className="login-panel">
          <div className="brand-block">
            <p className="eyebrow">Approved Synopsis Prototype</p>
            <h1>Machine Learning-Based Financial Fraud Detection System</h1>
          </div>

          <div className="login-card">
            <div className="login-card-head">
              <h2>Secure Sign In</h2>
              <p>Select a role to enter its dedicated module.</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <label>
                <span>User ID</span>
                <input defaultValue="admin" name="username" required />
              </label>

              <label>
                <span>Password</span>
                <input defaultValue="admin123" name="password" required type="password" />
              </label>

              <label>
                <span>Role</span>
                <select
                  aria-label="Role"
                  value={roleKey}
                  onChange={(event) => setRoleKey(event.target.value as RoleKey)}
                >
                  {roleOptions.map((option) => (
                    <option key={option} value={option}>
                      {roleKeyToRole[option]}
                    </option>
                  ))}
                </select>
              </label>

              <button className="btn btn-primary" type="submit">
                Open Role Workspace
              </button>
            </form>

            <div className="demo-credentials">
              <span>Access:</span>
              <strong>admin / admin123</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
