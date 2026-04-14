export const SHARED = `
  h2 {
    font-size: 28px;
    font-weight: 700;
    color: #2d2d2d;
    margin: 0 0 8px;
    font-family: var(--font-playfair), Georgia, serif;
    letter-spacing: -0.3px;
    line-height: 1.2;
  }
  .subtitle {
    font-size: 15px;
    color: rgba(45, 45, 45, 0.55);
    margin: 0 0 28px;
    line-height: 1.5;
  }
  .yt-input {
    display: block;
    width: 100%;
    padding: 18px 20px;
    background: white;
    border: 1.5px solid rgba(64, 106, 86, 0.18);
    border-radius: 16px;
    color: #2d2d2d;
    font-size: 20px;
    text-align: center;
    margin-bottom: 20px;
    transition: border-color 0.2s, box-shadow 0.2s;
    box-sizing: border-box;
    box-shadow: 0 2px 8px rgba(64, 106, 86, 0.06);
  }
  .yt-input::placeholder { color: rgba(45,45,45,0.25); }
  .yt-input:focus {
    outline: none;
    border-color: #2D5A3D;
    box-shadow: 0 0 0 3px rgba(64, 106, 86, 0.1);
  }
  .primary-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px 28px;
    background: #2D5A3D;
    border: none;
    border-radius: 16px;
    color: white;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 4px 16px rgba(64, 106, 86, 0.28);
    white-space: nowrap;
  }
  .primary-btn:hover:not(:disabled) {
    background: #355948;
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(64, 106, 86, 0.36);
  }
  .primary-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 50px;
    background: white;
    border: 1.5px solid rgba(64, 106, 86, 0.18);
    border-radius: 14px;
    color: rgba(45, 45, 45, 0.6);
    cursor: pointer;
    flex-shrink: 0;
    transition: border-color 0.2s, color 0.2s;
  }
  .back-btn:hover {
    border-color: #2D5A3D;
    color: #2D5A3D;
  }
  .btn-row {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .btn-row .primary-btn { flex: 1; }
  .skip-link {
    display: block;
    text-align: center;
    margin-top: 14px;
    color: rgba(45, 45, 45, 0.35);
    font-size: 13px;
    cursor: pointer;
    background: transparent;
    border: none;
    padding: 6px;
    transition: color 0.2s;
  }
  .skip-link:hover { color: rgba(45, 45, 45, 0.65); }
`;
