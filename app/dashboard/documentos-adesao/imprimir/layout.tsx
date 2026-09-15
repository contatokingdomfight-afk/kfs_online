export default function MembershipPrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @media print {
          @page {
            margin: 22mm 10mm 14mm 10mm;
          }
          .no-print,
          nav,
          header,
          footer,
          .admin-chat-fab-wrap {
            display: none !important;
          }
          body {
            background: #fff !important;
            color: #111 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .enrollment-form-document {
            padding-top: 0;
          }
          .print-doc-root {
            padding-top: 0;
          }
          .card {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: transparent !important;
          }
          .insurance-coverage-block {
            border: none !important;
            border-radius: 0 !important;
            background: transparent !important;
          }
          .print-doc-container {
            max-width: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
      <div className="print-doc-container" style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 48px" }}>
        {children}
      </div>
    </>
  );
}
