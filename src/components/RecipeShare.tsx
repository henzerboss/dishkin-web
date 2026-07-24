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

function encode(value: string): string {
  return encodeURIComponent(value);
}

export function RecipeShare({ title, url, imageUrl, heading, copyLabel, copiedLabel }: Props) {
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const links = useMemo(() => {
    const textWithUrl = `${title} ${url}`;
    return [
      { name: 'Telegram', href: `https://t.me/share/url?url=${encode(url)}&text=${encode(title)}` },
      { name: 'WhatsApp', href: `https://wa.me/?text=${encode(textWithUrl)}` },
      { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encode(url)}` },
      { name: 'X', href: `https://twitter.com/intent/tweet?url=${encode(url)}&text=${encode(title)}` },
      { name: 'Reddit', href: `https://www.reddit.com/submit?url=${encode(url)}&title=${encode(title)}` },
      ...(imageUrl
        ? [{ name: 'Pinterest', href: `https://www.pinterest.com/pin/create/button/?url=${encode(url)}&media=${encode(imageUrl)}&description=${encode(title)}` }]
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
    <section className="mt-7" aria-labelledby="recipe-share-heading">
      <h2 id="recipe-share-heading" className="text-base font-black">{heading}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
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
            className="btn-soft px-4 py-2 text-sm"
            aria-label={`${heading}: ${link.name}`}
          >
            {link.name}
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
