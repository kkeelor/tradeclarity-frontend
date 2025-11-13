// app/components/StructuredData.js
// Reusable structured data (JSON-LD) components for SEO

export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TradeClarity',
    url: 'https://tradeclarity.xyz',
    logo: 'https://tradeclarity.xyz/logo.png',
    description: 'Crypto trading analytics and psychology analysis tool that reveals hidden patterns in your trades',
    sameAs: [
      'https://twitter.com/trdclrty',
      // Add other social media links when available
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'tradeclarity-help@gmail.com',
      contactType: 'Customer Support',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function SoftwareApplicationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'TradeClarity',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: 'https://tradeclarity.xyz/pricing',
      priceSpecification: [
        {
          '@type': 'UnitPriceSpecification',
          price: '0',
          priceCurrency: 'USD',
          name: 'Free Plan',
        },
        {
          '@type': 'UnitPriceSpecification',
          price: '29',
          priceCurrency: 'USD',
          name: 'Trader Plan',
          billingIncrement: 'P1M',
        },
        {
          '@type': 'UnitPriceSpecification',
          price: '79',
          priceCurrency: 'USD',
          name: 'Pro Plan',
          billingIncrement: 'P1M',
        },
      ],
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '127',
    },
    featureList: [
      'Trading Psychology Analysis',
      'Pattern Detection',
      'Behavioral Insights',
      'Trade Performance Analytics',
      'Win Rate Analysis',
      'Exchange Integration (Binance, CoinDCX)',
      'CSV Upload Support',
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function WebSiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'TradeClarity',
    url: 'https://tradeclarity.xyz',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://tradeclarity.xyz/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function FAQPageSchema({ faqs }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function BreadcrumbSchema({ items }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
