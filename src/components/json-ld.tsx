export function JsonLd({ data }: { data: Record<string, unknown> | Array<Record<string, unknown>> }) {
  let payload: Record<string, unknown>;
  if (Array.isArray(data)) {
    const graph = data.map((item) => {
      const { '@context': _, ...rest } = item;
      return rest;
    });
    payload = {
      '@context': 'https://schema.org',
      '@graph': graph,
    };
  } else {
    payload = data;
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(payload).replace(/</g, "\\u003c") }} />;
}
