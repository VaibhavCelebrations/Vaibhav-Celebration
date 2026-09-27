import Script from "next/script";

const GA4 = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim();
const GTM = process.env.NEXT_PUBLIC_GTM_ID?.trim();
const PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();

/** Only ever contains characters allowed in these IDs — they are interpolated into inline scripts. */
const safeId = (id: string | undefined) => (id && /^[A-Za-z0-9_-]+$/.test(id) ? id : undefined);

/**
 * GA4 / GTM / Meta Pixel. Each renders nothing until its NEXT_PUBLIC_* ID is set, so this is safe to
 * ship before the client hands over analytics accounts. Scripts load after the page is interactive
 * so they never block rendering (Core Web Vitals).
 */
export function Analytics() {
  const ga = safeId(GA4);
  const gtm = safeId(GTM);
  const pixel = safeId(PIXEL);
  if (!ga && !gtm && !pixel) return null;

  return (
    <>
      {ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');`}
          </Script>
        </>
      )}
      {gtm && (
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}
        </Script>
      )}
      {pixel && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
