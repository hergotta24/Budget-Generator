'use client';
import React, { useRef, useState } from "react";
import Image from "next/image";
import styles from "./page.module.css";
import Papa from "papaparse";
import * as XLSX from "xlsx";

type UploadFile = {
  file: File;
  progress: number;
  status: "uploading" | "done" | "error";
};

const TABS = ["Home", "How To", "Upload", "Dashboard"];
const COMMONCOLUMNS = ['Account', 'Date', 'Amount', 'Balance', 'Category'];


export default function Home() {
  const [activeTab, setActiveTab] = useState("Home");
  const [files, setFiles] = useState<UploadFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const [modalFile, setModalFile] = useState<UploadFile | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<{ [key: string]: string }>({});

  const [masterTransactions, setMasterTransactions] = useState<any[]>([]);


  // Simulate upload progress
  const uploadFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const newFiles: UploadFile[] = Array.from(selectedFiles)
      .filter((file) =>
        [".csv", ".xls", ".xlsx"].some((ext) =>
          file.name.toLowerCase().endsWith(ext)
        )
      )
      .map((file) => ({
        file,
        progress: 0,
        status: "uploading" as const,
      }));

    setFiles((prev) => [...prev, ...newFiles]);

    newFiles.forEach((uploadFile, idx) => {
      const interval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f, i) =>
            f.file === uploadFile.file
              ? {
                ...f,
                progress: Math.min(f.progress + 10, 100),
                status: f.progress + 10 >= 100 ? "done" : "uploading",
              }
              : f
          )
        );
        if (uploadFile.progress + 10 >= 100) clearInterval(interval);
      }, 200);
    });
  };

  const handleSaveMapping = () => {
    if (!modalFile) return;

    const file = modalFile.file;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      let rows: any[] = [];

      if (file.name.endsWith(".csv")) {
        const parsed = Papa.parse(data as string, { header: true });
        rows = parsed.data as any[];
      } else if (file.name.endsWith(".xls") || file.name.endsWith(".xlsx")) {
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        // Convert array of arrays to array of objects using headers
        const headers = rows[0];
        rows = rows.slice(1).map((row: any[]) => {
          const obj: any = {};
          headers.forEach((h: string, i: number) => {
            obj[h] = row[i];
          });
          return obj;
        });
      }

      // Map each row to master transaction using columnMapping
      const mappedTransactions = rows.map(row => {
        const tx: any = {};
        COMMONCOLUMNS.forEach(col => {
          const header = columnMapping[col];
          tx[col] = row[header];
        });
        return tx;
      });

      setMasterTransactions(prev => [...prev, ...mappedTransactions]);
    };

    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const handleConfigure = (file: File) => {
    setModalFile(files.find(f => f.file === file) || null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (file.name.endsWith(".csv")) {
        const parsed = Papa.parse<string[]>(data as string, { header: true });
        setFileHeaders(parsed.meta.fields || []);
      } else if (file.name.endsWith(".xls") || file.name.endsWith(".xlsx")) {
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        setFileHeaders(json[0] as string[]);
      }
      setColumnMapping({});
    };
    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    uploadFiles(e.dataTransfer.files);
  };

  const handleBrowse = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    uploadFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (file: File) => {
    setFiles((prev) => prev.filter((f) => f.file !== file));
  };

  // Tab content
  function renderTabContent() {
    if (activeTab === "Home") {
      return <div>Welcome to the Home tab!</div>;
    }
    if (activeTab === "How To") {
      return <div>Instructions go here.</div>;
    }
    if (activeTab === "Upload") {
      return (
        <>
          <div className="header-section">
            <h1>UPLOAD FILES</h1>
            <p>
              Upload files you want to share with your team members.<br />
              <span style={{ color: "#888" }}>
                Only CSV, Excel files are allowed.
              </span>
            </p>
          </div>
          <div
            className="drop-section"
            style={{
              border: "2px dashed #b3c6ff",
              borderRadius: 16,
              padding: 32,
              textAlign: "center",
              marginBottom: 24,
            }}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <Image
              src="/cloud-upload.svg"
              alt="Upload Icon"
              width={50}
              height={50}
            />
            <p style={{ margin: "16px 0 8px" }}>
              Drag & Drop your files here
              <br />
              <span style={{ color: "#aaa" }}>OR</span>
            </p>
            <button className="btn btn-primary" onClick={handleBrowse}>
              Browse Files
            </button>
            <input
              type="file"
              accept=".csv,.xls,.xlsx"
              multiple
              ref={inputRef}
              style={{ display: "none" }}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <h4 style={{ marginBottom: 8 }}>Uploaded Files</h4>
            {files.map((f, idx) => (
              <div
                key={f.file.name + idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "#fff",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                  boxShadow: "0 1px 4px #e0e0e0",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    background: "#e3e8ff",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <span style={{ fontWeight: "bold", color: "#4a6cf7" }}>
                    {f.file.name.endsWith(".csv")
                      ? "CSV"
                      : f.file.name.endsWith(".xls") ||
                        f.file.name.endsWith(".xlsx")
                        ? "XLS"
                        : "FILE"}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{f.file.name}</div>
                  <div
                    style={{
                      height: 6,
                      background: "#e3e8ff",
                      borderRadius: 3,
                      margin: "6px 0",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        width: `${f.progress}%`,
                        height: "100%",
                        background:
                          f.status === "done"
                            ? "#4a6cf7"
                            : "linear-gradient(90deg,#4a6cf7,#b3c6ff)",
                        borderRadius: 3,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: "#888" }}>
                    {(f.file.size / (1024 * 1024)).toFixed(1)} MB
                  </div>
                </div>
                <div style={{ marginLeft: 12 }}>
                  {f.status === "done" ? (
                    <span style={{ color: "#4a6cf7", fontWeight: "bold" }}>
                      &#10003;
                    </span>
                  ) : (
                    <span style={{ color: "#888" }}>
                      {f.progress}%
                    </span>
                  )}
                </div>
                <button
                  style={{
                    marginLeft: 8,
                    background: "none",
                    border: "none",
                    color: "#888",
                    fontSize: 18,
                    cursor: "pointer",
                  }}
                  onClick={() => removeFile(f.file)}
                  title="Remove"
                >
                  &times;
                </button>

                {f.status === "done" ? (
                  <>
                    <button
                      className="ms-4 btn btn-danger"
                      data-bs-toggle="modal"
                      data-bs-target="#exampleModal"
                      onClick={() => handleConfigure(f.file)}
                    >
                      Configure
                    </button>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </>
      );
    }
    if (activeTab === "Dashboard") {
      return (
        <div>
          <h4>Master Transactions</h4>
          <pre>{JSON.stringify(masterTransactions, null, 2)}</pre>
        </div>
      );
    }
    return null;
  }

  return (
    <div className={styles.page}>
      <main className={`${styles.main} pt-4`}>
        <div className="container">
          {/* Tab Navigation */}
          <nav style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "8px 24px",
                  borderRadius: 8,
                  border: "none",
                  background: activeTab === tab ? "#e3e8ff" : "#f8faff",
                  color: activeTab === tab ? "#4a6cf7" : "#333",
                  fontWeight: activeTab === tab ? "bold" : "normal",
                  cursor: "pointer",
                }}
              >
                {tab}
              </button>
            ))}
          </nav>
          {/* Tab Content */}
          {renderTabContent()}
        </div>

      </main>
      <div className="modal fade" id="exampleModal" aria-labelledby="exampleModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">Map Columns</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              {fileHeaders.length === 0 ? (
                <div>No headers found.</div>
              ) : (
                <form>
                  {COMMONCOLUMNS.map((col) => (
                    <div className="mb-3" key={col}>
                      <label className="form-label">{col}</label>
                      <select
                        className="form-select"
                        value={columnMapping[col] || ""}
                        onChange={e =>
                          setColumnMapping(mapping => ({
                            ...mapping,
                            [col]: e.target.value
                          }))
                        }
                      >
                        <option value="">Select header</option>
                        {fileHeaders.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </form>
              )}
            </div>
            <div className="modal-footer py-1">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              <button
                type="button"
                className="btn btn-primary"
                data-bs-dismiss="modal"
                onClick={handleSaveMapping}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      </div>
      <footer className={styles.footer}></footer>
    </div>
  );
}
