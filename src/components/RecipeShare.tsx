'use client';

import { Check, Copy, Share2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface Props {
  title: string;
  url: string;
  imageUrl?: string;
  heading: string;
  copyLabel: string;
  copiedLabel: string;
}

type BrandIconName = 'telegram' | 'whatsapp' | 'facebook' | 'x' | 'reddit' | 'pinterest';

interface ShareLink {
  name: string;
  icon: BrandIconName;
  href: string;
  color: string;
}

function encode(value: string): string {
  return encodeURIComponent(value);
}

// Brand SVG path data is adapted from Font Awesome Free 6.7.2 (CC BY 4.0).
// Attribution details are included in THIRD_PARTY_NOTICES.md.
function BrandIcon({ name }: { name: BrandIconName }) {
  const icons: Record<BrandIconName, { viewBox: string; path: string }> = {
    telegram: {
      viewBox: '0 0 496 512',
      path: 'M248,8C111.033,8,0,119.033,0,256S111.033,504,248,504,496,392.967,496,256,384.967,8,248,8ZM362.952,176.66c-3.732,39.215-19.881,134.378-28.1,178.3-3.476,18.584-10.322,24.816-16.948,25.425-14.4,1.326-25.338-9.517-39.287-18.661-21.827-14.308-34.158-23.215-55.346-37.177-24.485-16.135-8.612-25,5.342-39.5,3.652-3.793,67.107-61.51,68.335-66.746.153-.655.3-3.1-1.154-4.384s-3.59-.849-5.135-.5q-3.283.746-104.608,69.142-14.845,10.194-26.894,9.934c-8.855-.191-25.888-5.006-38.551-9.123-15.531-5.048-27.875-7.717-26.8-16.291q.84-6.7,18.45-13.7,108.446-47.248,144.628-62.3c68.872-28.647,83.183-33.623,92.511-33.789,2.052-.034,6.639.474,9.61,2.885a10.452,10.452,0,0,1,3.53,6.716A43.765,43.765,0,0,1,362.952,176.66Z',
    },
    whatsapp: {
      viewBox: '0 0 448 512',
      path: 'M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z',
    },
    facebook: {
      viewBox: '0 0 320 512',
      path: 'M80 299.3V512H196V299.3h86.5l18-97.8H196V166.9c0-51.7 20.3-71.5 72.7-71.5 16.3 0 29.4 .4 37 1.2V7.9C291.4 4 256.4 0 236.2 0C129.3 0 80 50.5 80 159.4v42.1H14v97.8H80z',
    },
    x: {
      viewBox: '0 0 512 512',
      path: 'M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z',
    },
    reddit: {
      viewBox: '0 0 512 512',
      path: 'M373 138.6c-25.2 0-46.3-17.5-51.9-41l0 0c-30.6 4.3-54.2 30.7-54.2 62.4l0 .2c47.4 1.8 90.6 15.1 124.9 36.3c12.6-9.7 28.4-15.5 45.5-15.5c41.3 0 74.7 33.4 74.7 74.7c0 29.8-17.4 55.5-42.7 67.5c-2.4 86.8-97 156.6-213.2 156.6S45.5 410.1 43 323.4C17.6 311.5 0 285.7 0 255.7c0-41.3 33.4-74.7 74.7-74.7c17.2 0 33 5.8 45.7 15.6c34-21.1 76.8-34.4 123.7-36.4l0-.3c0-44.3 33.7-80.9 76.8-85.5C325.8 50.2 347.2 32 373 32c29.4 0 53.3 23.9 53.3 53.3s-23.9 53.3-53.3 53.3zM157.5 255.3c-20.9 0-38.9 20.8-40.2 47.9s17.1 38.1 38 38.1s36.6-9.8 37.8-36.9s-14.7-49.1-35.7-49.1zM395 303.1c-1.2-27.1-19.2-47.9-40.2-47.9s-36.9 22-35.7 49.1c1.2 27.1 16.9 36.9 37.8 36.9s39.3-11 38-38.1zm-60.1 70.8c1.5-3.6-1-7.7-4.9-8.1c-23-2.3-47.9-3.6-73.8-3.6s-50.8 1.3-73.8 3.6c-3.9 .4-6.4 4.5-4.9 8.1c12.9 30.8 43.3 52.4 78.7 52.4s65.8-21.6 78.7-52.4z',
    },
    pinterest: {
      viewBox: '0 0 384 512',
      path: 'M204 6.5C101.4 6.5 0 74.9 0 185.6 0 256 39.6 296 63.6 296c9.9 0 15.6-27.6 15.6-35.4 0-9.3-23.7-29.1-23.7-67.8 0-80.4 61.2-137.4 140.4-137.4 68.1 0 118.5 38.7 118.5 109.8 0 53.1-21.3 152.7-90.3 152.7-24.9 0-46.2-18-46.2-43.8 0-37.8 26.4-74.4 26.4-113.4 0-66.2-93.9-54.2-93.9 25.8 0 16.8 2.1 35.4 9.6 50.7-13.8 59.4-42 147.9-42 209.1 0 18.9 2.7 37.5 4.5 56.4 3.4 3.8 1.7 3.4 6.9 1.5 50.4-69 48.6-82.5 71.4-172.8 12.3 23.4 44.1 36 69.3 36 106.2 0 153.9-103.5 153.9-196.8C384 71.3 298.2 6.5 204 6.5z',
    },
  };

  const icon = icons[name];

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={icon.viewBox}
      className="share-brand-icon"
    >
      <path d={icon.path} fill="currentColor" />
    </svg>
  );
}

export function RecipeShare({ title, url, imageUrl, heading, copyLabel, copiedLabel }: Props) {
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const links = useMemo<ShareLink[]>(() => {
    const textWithUrl = `${title} ${url}`;
    return [
      {
        name: 'Telegram',
        icon: 'telegram',
        color: '#229ED9',
        href: `https://t.me/share/url?url=${encode(url)}&text=${encode(title)}`,
      },
      {
        name: 'WhatsApp',
        icon: 'whatsapp',
        color: '#25D366',
        href: `https://wa.me/?text=${encode(textWithUrl)}`,
      },
      {
        name: 'Facebook',
        icon: 'facebook',
        color: '#1877F2',
        href: `https://www.facebook.com/sharer/sharer.php?u=${encode(url)}`,
      },
      {
        name: 'X',
        icon: 'x',
        color: '#111111',
        href: `https://twitter.com/intent/tweet?url=${encode(url)}&text=${encode(title)}`,
      },
      {
        name: 'Reddit',
        icon: 'reddit',
        color: '#FF4500',
        href: `https://www.reddit.com/submit?url=${encode(url)}&title=${encode(title)}`,
      },
      ...(imageUrl
        ? [
            {
              name: 'Pinterest',
              icon: 'pinterest' as const,
              color: '#E60023',
              href: `https://www.pinterest.com/pin/create/button/?url=${encode(url)}&media=${encode(imageUrl)}&description=${encode(title)}`,
            },
          ]
        : []),
    ];
  }, [imageUrl, title, url]);

  async function shareNative() {
    try {
      await navigator.share({ title, text: title, url });
    } catch {
      // Closing the system share sheet is a normal user action.
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement('textarea');
      input.value = url;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="card mt-6 p-6" aria-labelledby="recipe-share-heading">
      <h2 id="recipe-share-heading" className="text-xl font-black">{heading}</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canShare ? (
          <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={shareNative}>
            <Share2 size={16} /> {heading}
          </button>
        ) : null}
        {links.map((link) => (
          <a
            key={link.name}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="btn-soft share-brand-button"
            style={{ color: link.color }}
            aria-label={`${heading}: ${link.name}`}
            title={link.name}
          >
            <BrandIcon name={link.icon} />
          </a>
        ))}
        <button type="button" className="btn-soft px-4 py-2 text-sm" onClick={copyLink}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
    </section>
  );
}
