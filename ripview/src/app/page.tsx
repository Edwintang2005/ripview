"use client";

import { useState } from "react";
import styles from "./page.module.css";
import Image from "next/image";
import CsvHandler from "../components/CsvHandler";

export default function Home() {
    const [csvData, setCsvData] = useState<string[][]>([]);

    return (
        <div className={styles.page}>
            <main className={styles.main}>
                <Image
                    className={styles.logo}
                    src="/next.svg"
                    alt="Next.js logo"
                    width={180}
                    height={38}
                    priority
                />

                <div className={styles.csvContainer}>

                    {/* Title */}
                    <h1 style={{ marginBottom: "20px", color: "var(--foreground)" }}>
                        Transport Location Data
                    </h1>

                    {/* Handles the file upload
                    When a file is loaded, send the data to setCsvData to store it */}
                    <CsvHandler onDataLoaded={setCsvData} />

                    {/* Display table IFF there is data
                    && is like, if csvData has anything in it, then show the following */}
                    {csvData.length > 0 && (
                        // Set the overflow to auto so that the table can scroll{/*  */}
                        <div style={{ overflowX: "auto" }}>
                            <table
                                style={{
                                    borderCollapse: "collapse",
                                    width: "100%",
                                    marginTop: "20px",
                                    color: "var(--foreground)",
                                }}
                            >
                                {/* For each row, create a table row, 
                                then for each piece of data, 
                                create a table cell and add data and style it */}
                                <tbody>
                                    {csvData.map((row, index) => (
                                        <tr key={index}>
                                            {row.map((cell, cellIndex) => (
                                                <td
                                                    key={cellIndex}
                                                    style={{
                                                        border: "1px solid var(--border-color)",
                                                        padding: "8px",
                                                        color: "var(--foreground)",
                                                    }}
                                                >
                                                    {cell}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <ol>
                    <li>
                        Get started by editing <code>src/app/page.tsx</code>.
                    </li>
                    <li>Save and see your changes instantly.</li>
                </ol>

                <div className={styles.ctas}>
                    <a
                        className={styles.primary}
                        href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Image
                            className={styles.logo}
                            src="/vercel.svg"
                            alt="Vercel logomark"
                            width={20}
                            height={20}
                        />
                        Deploy now
                    </a>
                    <a
                        href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.secondary}
                    >
                        Read our docs
                    </a>
                </div>
            </main>
            <footer className={styles.footer}>
                <a
                    href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Image
                        aria-hidden
                        src="/file.svg"
                        alt="File icon"
                        width={16}
                        height={16}
                    />
                    Learn
                </a>
                <a
                    href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Image
                        aria-hidden
                        src="/window.svg"
                        alt="Window icon"
                        width={16}
                        height={16}
                    />
                    Examples
                </a>
                <a
                    href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Image
                        aria-hidden
                        src="/globe.svg"
                        alt="Globe icon"
                        width={16}
                        height={16}
                    />
                    Go to nextjs.org →
                </a>
            </footer>
        </div>
    );
}
