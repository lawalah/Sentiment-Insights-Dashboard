import "./globals.css";

export const metadata = {
  title: "MAE Sentiment Insights",
  description: "Sentiment analysis dashboard for MAE banking app user feedback",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
