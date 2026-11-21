import Script from "next/script";

const containerId = "GTM-MSTDF86G";

export function GoogleTagManager() {
  return <>
    <Script id="google-tag-manager" strategy="afterInteractive">{`
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      (function () {
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtm.js?id=${containerId}';
        document.head.appendChild(script);
      })();
    `}</Script>
    <noscript>
      <iframe src={`https://www.googletagmanager.com/ns.html?id=${containerId}`} height="0" width="0" style={{ display: "none", visibility: "hidden" }} title="Google Tag Manager" />
    </noscript>
  </>;
}
