export default function MembershipPrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @media print {
          .no-print,
          nav,
          header,
          footer {
            display: none !important;
          }
          body {
            background: #fff !important;
            color: #111 !important;
          }
          .card {
            box-shadow: none !important;
            border: 1px solid #ddd !important;
          }
        }
      `}</style>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 48px" }}>{children}</div>
    </>
  );
}
