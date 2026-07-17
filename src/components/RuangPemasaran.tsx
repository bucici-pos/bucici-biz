/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Palette, Share2, Download, Image as ImageIcon, Check, 
  RefreshCw, Layers, Upload, HelpCircle, Scissors, Sliders, Eye, 
  EyeOff, Maximize2, Minimize2, ChevronRight, Sparkle, Compass, 
  Sun, Flame, Zap, RotateCcw, Camera, ArrowRight, CheckCircle2 
} from 'lucide-react';

interface RuangPemasaranProps {
  tenantId: string;
  products?: any[];
}

interface MarketingAlternative {
  alternative_name: string;
  title_copy: string;
  tagline_copy: string;
  cta_copy: string;
  price_display: string;
  bg_color: string;
  accent_color: string;
  text_color: string;
  layout_description: string;
}

export default function RuangPemasaran({ tenantId, products = [] }: RuangPemasaranProps) {
  // Navigation Tabs: 'upgrade' (Upgrade Poster) or 'remove_bg' (Hapus Background)
  const [currentTab, setCurrentTab] = useState<'upgrade' | 'remove_bg'>('upgrade');

  // =========================================================================
  // STATE FOR "UPGRADE POSTER"
  // =========================================================================
  const [title, setTitle] = useState('Kopi Susu Aren Gula Jawa');
  const [tagline, setTagline] = useState('Nikmatnya Kopi Asli dari Biji Pilihan');
  const [price, setPrice] = useState('Rp 15.000 (Coret Rp 20.000)');
  const [contact, setContact] = useState('@kopi_bucici');
  const [cta, setCta] = useState('Serbu Sekarang!');
  const [style, setStyle] = useState<'Minimalist' | 'Bold' | 'Soft'>('Minimalist');
  const [ambience, setAmbience] = useState('Pencahayaan hangat dan cerah, latar belakang kayu estetik');

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [alternatives, setAlternatives] = useState<MarketingAlternative[]>([]);
  const [selectedAlt, setSelectedAlt] = useState<MarketingAlternative | null>(null);
  
  // Customization controls inside Poster Canvas
  const [canvasBg, setCanvasBg] = useState('#FAF7F2');
  const [canvasTextColor, setCanvasTextColor] = useState('#3F2E21');
  const [canvasAccentColor, setCanvasAccentColor] = useState('#D4A373');
  const [canvasImg, setCanvasImg] = useState('https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80');
  const [mockUploading, setMockUploading] = useState(false);

  // Aspect Ratio & Advanced Custom Dimensions
  const [designRatio, setDesignRatio] = useState<'4/5' | '1/1' | '9/16' | '16/9' | 'custom'>('4/5');
  const [customWidth, setCustomWidth] = useState(1200);
  const [customHeight, setCustomHeight] = useState(1500);

  // Studio Photographer configurations
  const [quality, setQuality] = useState<'standard' | 'ultra' | 'studio'>('studio');
  const [lighting, setLighting] = useState<'soft' | 'sunset' | 'rim' | 'neon' | 'sunbeam'>('sunset');
  const [showOverlay, setShowOverlay] = useState<boolean>(true);

  // =========================================================================
  // STATE FOR "HAPUS BACKGROUND"
  // =========================================================================
  const [removeBgImg, setRemoveBgImg] = useState('https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80');
  const [isProcessingBg, setIsProcessingBg] = useState(false);
  const [isProcessedBg, setIsProcessedBg] = useState(true); // default true for first look
  const [sliderPosition, setSliderPosition] = useState(50);
  const [featherRadius, setFeatherRadius] = useState(2);
  const [bgThreshold, setBgThreshold] = useState<number>(45);
  const [keyColorMode, setKeyColorMode] = useState<'auto' | 'custom'>('auto');
  const [customKeyColor, setCustomKeyColor] = useState<string>('#ffffff');
  const [processedBgImg, setProcessedBgImg] = useState<string>('');
  const [bgRemovalStyle, setBgRemovalStyle] = useState<'transparent' | 'solid'>('transparent');
  const [bgRemovalSolidColor, setBgRemovalSolidColor] = useState('#F4F4F5');

  // Custom AI subject focus coordinates (Lasso adjusters)
  const [lassoShape, setLassoShape] = useState<'ellipse' | 'rounded' | 'circle'>('ellipse');
  const [lassoWidth, setLassoWidth] = useState(54);
  const [lassoHeight, setLassoHeight] = useState(78);
  const [lassoX, setLassoX] = useState(50);
  const [lassoY, setLassoY] = useState(53);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgRemoveFileInputRef = useRef<HTMLInputElement>(null);

  // Load the 3 Art Director layouts on mount automatically
  useEffect(() => {
    const initialAlts: MarketingAlternative[] = [
      {
        alternative_name: "Minimalis Bersih",
        title_copy: "Kopi Susu Aren Gula Jawa",
        tagline_copy: "Nikmatnya Kopi Asli dari Biji Pilihan",
        cta_copy: "Serbu Sekarang!",
        price_display: "Rp 15.000 (Coret Rp 20.000)",
        bg_color: "#FAF7F2",
        accent_color: "#D4A373",
        text_color: "#3F2E21",
        layout_description: "Tata letak minimalis bersih seimbang dengan ruang kosong luas untuk nuansa kafe premium."
      },
      {
        alternative_name: "Gaya Bold Modern",
        title_copy: "KOPI SUSU AREN GULA JAWA",
        tagline_copy: "Rasa Manis Gurih Alami Biji Kopi Pilihan Utama",
        cta_copy: "SERBU SEKARANG!",
        price_display: "Rp 15.000 (Coret Rp 20.000)",
        bg_color: "#E6DFD3",
        accent_color: "#8B5A2B",
        text_color: "#1C130C",
        layout_description: "Asimetris modern dengan judul block tebal, garis pembatas tebal, dan kontras visual tinggi."
      },
      {
        alternative_name: "Mewah / Premium",
        title_copy: "Edisi Premium: Kopi Susu Aren Gula Jawa",
        tagline_copy: "Pencahayaan hangat & cerah dengan latar belakang kayu estetik berkelas",
        cta_copy: "Pesan Sekarang!",
        price_display: "Rp 15.000 (Coret Rp 20.000)",
        bg_color: "#1C120B",
        accent_color: "#E8A855",
        text_color: "#FFF8F2",
        layout_description: "Nuansa arang coklat kayu gelap mewah dengan efek pancaran cahaya keemasan (warm ambience) sinematik."
      }
    ];
    setAlternatives(initialAlts);
    setSelectedAlt(initialAlts[0]);
    setCanvasBg(initialAlts[0].bg_color);
    setCanvasTextColor(initialAlts[0].text_color);
    setCanvasAccentColor(initialAlts[0].accent_color);
  }, []);

  // Handle uploading custom product image for poster
  const handleRealUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMockUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCanvasImg(reader.result as string);
        setMockUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle uploading custom product image for background removal
  const handleBgRemoveUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingBg(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setRemoveBgImg(reader.result as string);
        // Simulate scanning
        setTimeout(() => {
          setIsProcessingBg(false);
          setIsProcessedBg(true);
        }, 1500);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const triggerBgRemoveFileInput = () => {
    bgRemoveFileInputRef.current?.click();
  };

  const handleMockUpload = () => {
    setMockUploading(true);
    setTimeout(() => {
      setCanvasImg('https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80');
      setMockUploading(false);
    }, 800);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAlternatives([]);
    setSelectedAlt(null);

    // Client-side high-quality fallback copy
    const localFallbacks = [
      {
        alternative_name: "Minimalis Bersih",
        title_copy: title.trim() || "Produk Pilihan Terbaik",
        tagline_copy: tagline.trim() || "Kualitas nomor satu untuk keluarga Anda.",
        cta_copy: cta.trim() || "Dapatkan Sekarang!",
        price_display: price.trim() || "Hubungi Kami",
        bg_color: "#FAF7F2",
        accent_color: "#D4A373",
        text_color: "#3F2E21",
        layout_description: "Tata letak minimalis bersih seimbang dengan ruang kosong luas untuk nuansa kafe premium."
      },
      {
        alternative_name: "Gaya Bold Modern",
        title_copy: (title.trim() || "Produk Pilihan").toUpperCase(),
        tagline_copy: tagline.trim() || "Solusi cerdas, hemat, dan praktis setiap hari.",
        cta_copy: (cta.trim() || "Beli Sekarang!").toUpperCase(),
        price_display: price.trim() || "Penawaran Khusus",
        bg_color: "#E6DFD3",
        accent_color: "#8B5A2B",
        text_color: "#1C130C",
        layout_description: "Asimetris modern dengan judul block tebal, garis pembatas tebal, dan kontras visual tinggi."
      },
      {
        alternative_name: "Mewah / Premium",
        title_copy: `Edisi Premium: ${title.trim() || "Produk Eksklusif"}`,
        tagline_copy: tagline.trim() || "Rasakan kelezatan dan kenyamanan rasa otentik.",
        cta_copy: cta.trim() || "Pesan via WhatsApp",
        price_display: price.trim() || "Persediaan Terbatas",
        bg_color: "#1C120B",
        accent_color: "#E8A855",
        text_color: "#FFF8F2",
        layout_description: "Nuansa arang coklat kayu gelap mewah dengan efek pancaran cahaya keemasan (warm ambience) sinematik."
      }
    ];

    try {
      const res = await fetch('/api/ai/marketing-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          tagline: tagline.trim(),
          price: price.trim(),
          info: contact.trim(),
          cta: cta.trim(),
          style: style,
          ambience: ambience.trim()
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAlternatives(data.data);
        loadAlternativeToCanvas(data.data[0]);
      } else {
        setAlternatives(localFallbacks);
        loadAlternativeToCanvas(localFallbacks[0]);
      }
    } catch (err) {
      console.error("Client fetch error, using local fallback alternatives:", err);
      setAlternatives(localFallbacks);
      loadAlternativeToCanvas(localFallbacks[0]);
    } finally {
      setLoading(false);
    }
  };

  const loadAlternativeToCanvas = (alt: MarketingAlternative) => {
    setSelectedAlt(alt);
    setCanvasBg(alt.bg_color);
    setCanvasTextColor(alt.text_color);
    setCanvasAccentColor(alt.accent_color);
  };

  // Real computer-vision background removal / segmentation processor
  const runRealSegmentation = (imageSrc: string, forceHd: boolean = false): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      if (!imageSrc) {
        reject("No image source provided");
        return;
      }
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.referrerPolicy = "no-referrer";
      img.src = imageSrc;

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          // Downscale preview to max 500px for ultra fast real-time sliders, but keep full resolution for actual HD downloads!
          const maxDim = forceHd ? Math.max(img.naturalWidth, img.naturalHeight) : 500;
          let w = img.naturalWidth || 500;
          let h = img.naturalHeight || 500;

          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject("Could not get 2D canvas context");
            return;
          }

          ctx.drawImage(img, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;

          // 1. Resolve key target background color
          let targetR = 255, targetG = 255, targetB = 255;
          if (keyColorMode === 'custom') {
            const hex = customKeyColor.replace('#', '');
            targetR = parseInt(hex.substring(0, 2), 16) || 255;
            targetG = parseInt(hex.substring(2, 4), 16) || 255;
            targetB = parseInt(hex.substring(4, 6), 16) || 255;
          } else {
            // Auto detect from corners
            const cornerIndices = [
              0, // Top-Left
              Math.max(0, (w - 1) * 4), // Top-Right
              Math.max(0, (h - 1) * w * 4), // Bottom-Left
              Math.max(0, ((h - 1) * w + (w - 1)) * 4) // Bottom-Right
            ];
            let sumR = 0, sumG = 0, sumB = 0;
            cornerIndices.forEach(idx => {
              if (idx < data.length) {
                sumR += data[idx];
                sumG += data[idx + 1];
                sumB += data[idx + 2];
              }
            });
            targetR = Math.round(sumR / 4);
            targetG = Math.round(sumG / 4);
            targetB = Math.round(sumB / 4);
          }

          // 2. Lasso coordinates in actual pixels
          const cx = w * (lassoX / 100);
          const cy = h * (lassoY / 100);
          const rx = w * (lassoWidth / 100) / 2;
          const ry = h * (lassoHeight / 100) / 2;

          const featherWidth = featherRadius * 4 + 1; // Scale factor for edge transitions
          const currentThreshold = bgThreshold;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a === 0) continue;

            // Pixel x, y coordinates
            const idx = i / 4;
            const px = idx % w;
            const py = Math.floor(idx / w);

            // Check if inside our focal area
            let insideLasso = true;
            if (lassoShape === 'circle') {
              const d = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
              insideLasso = d <= rx;
            } else if (lassoShape === 'rounded') {
              insideLasso = (px >= cx - rx && px <= cx + rx && py >= cy - ry && py <= cy + ry);
            } else { // ellipse
              insideLasso = (((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2) <= 1;
            }

            if (!insideLasso) {
              data[i + 3] = 0; // Cut off out-of-focus background immediately
              continue;
            }

            // Calculate color distance (Chroma Euclidean)
            const dist = Math.sqrt((r - targetR) ** 2 + (g - targetG) ** 2 + (b - targetB) ** 2);

            if (dist < currentThreshold) {
              if (dist < currentThreshold - featherWidth) {
                data[i + 3] = 0; // Transparent
              } else {
                // Smooth antialiased edge feathering
                const ratio = (dist - (currentThreshold - featherWidth)) / featherWidth;
                data[i + 3] = Math.round(a * ratio);
              }
            }
          }

          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = (e) => {
        reject(e);
      };
    });
  };

  // Run the computer vision segmentation automatically on input/slider changes
  useEffect(() => {
    if (!removeBgImg) return;
    
    let active = true;
    runRealSegmentation(removeBgImg, false)
      .then(dataUrl => {
        if (active) {
          setProcessedBgImg(dataUrl);
        }
      })
      .catch(err => console.error("Real segmentation computation error:", err));

    return () => {
      active = false;
    };
  }, [removeBgImg, bgThreshold, featherRadius, lassoShape, lassoWidth, lassoHeight, lassoX, lassoY, customKeyColor, keyColorMode]);

  // Trigger background removal simulation scan (for UI flair, then commits the image)
  const triggerSegmentation = () => {
    setIsProcessingBg(true);
    setIsProcessedBg(false);
    setTimeout(() => {
      setIsProcessingBg(false);
      setIsProcessedBg(true);
    }, 1200);
  };

  const resetBgRemoval = () => {
    setIsProcessedBg(false);
    setFeatherRadius(2);
    setBgThreshold(45);
    setKeyColorMode('auto');
    setCustomKeyColor('#ffffff');
    setLassoWidth(54);
    setLassoHeight(78);
    setLassoX(50);
    setLassoY(53);
  };

  // Helper function to draw rounded rectangle on Canvas
  const drawRoundedRect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  };

  // Handle high definition Canvas rendering & download
  const handleDownload = () => {
    if (!selectedAlt) return;
    setDownloading(true);

    try {
      const canvas = document.createElement('canvas');
      let width = 1200;
      let height = 1500;

      if (designRatio === '1/1') {
        width = 1200; height = 1200;
      } else if (designRatio === '9/16') {
        width = 1080; height = 1920;
      } else if (designRatio === '16/9') {
        width = 1920; height = 1080;
      } else if (designRatio === 'custom') {
        width = customWidth;
        height = customHeight;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Draw solid background
      ctx.fillStyle = canvasBg;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw visual accent shapes or professional lighting gradients based on style/lighting
      if (selectedAlt.alternative_name === "Mewah / Premium" || lighting === 'rim' || lighting === 'sunset') {
        // Dramatic Radial glow
        const glow = ctx.createRadialGradient(width / 2, height * 0.45, width * 0.1, width / 2, height * 0.45, width * 0.7);
        if (lighting === 'sunset') {
          glow.addColorStop(0, '#fdba7440'); // Warm orange-ish
          glow.addColorStop(1, 'transparent');
        } else if (lighting === 'neon') {
          glow.addColorStop(0, '#ec489930'); // Pink neon glow
          glow.addColorStop(1, 'transparent');
        } else {
          glow.addColorStop(0, `${canvasAccentColor}44`);
          glow.addColorStop(1, 'transparent');
        }
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        // Premium thin inner frame border
        ctx.strokeStyle = `${canvasAccentColor}44`;
        ctx.lineWidth = width * 0.015;
        ctx.strokeRect(width * 0.03, width * 0.03, width - (width * 0.06), height - (width * 0.06));
      } else if (selectedAlt.alternative_name === "Gaya Bold Modern") {
        ctx.fillStyle = canvasAccentColor;
        ctx.fillRect(0, 0, width, height * 0.02);

        ctx.strokeStyle = canvasTextColor;
        ctx.lineWidth = width * 0.012;
        ctx.strokeRect(width * 0.04, width * 0.04, width - (width * 0.08), height - (width * 0.08));
      } else {
        // Soft standard gradients
        ctx.fillStyle = canvasAccentColor;
        ctx.globalAlpha = 0.12;
        ctx.beginPath();
        ctx.arc(width, 0, width * 0.4, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = canvasTextColor;
        ctx.globalAlpha = 0.06;
        ctx.beginPath();
        ctx.arc(0, height, width * 0.35, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // 3. Draw soft studio shadow for the product image in the middle
      const imageWidth = width * 0.58;
      const imageHeight = height * 0.42;
      const imageX = (width - imageWidth) / 2;
      const imageY = height * 0.28;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 45;
      ctx.shadowOffsetY = 25;

      // 4. Draw the product image
      const productImg = new Image();
      productImg.crossOrigin = "anonymous";
      productImg.referrerPolicy = "no-referrer";
      productImg.src = canvasImg;

      productImg.onload = () => {
        // Draw image inside custom clean clipping frame
        drawRoundedRect(ctx, imageX, imageY, imageWidth, imageHeight, 32);
        ctx.clip();
        ctx.drawImage(productImg, imageX, imageY, imageWidth, imageHeight);
        ctx.restore();

        // 5. Draw text elements ONLY if typography overlay is enabled
        if (showOverlay) {
          // Draw "KAMPANYE KOMERSIAL RESMI" badge
          ctx.fillStyle = canvasTextColor;
          ctx.font = "900 16px system-ui, -apple-system, sans-serif";
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          const labelText = "KAMPANYE KOMERSIAL RESMI";
          const labelWidth = ctx.measureText(labelText).width + 30;
          const labelX = (width - labelWidth) / 2;
          const labelY = height * 0.08;

          ctx.fillStyle = `${canvasTextColor}12`;
          drawRoundedRect(ctx, labelX, labelY, labelWidth, 34, 17);
          ctx.fill();

          ctx.fillStyle = canvasTextColor;
          ctx.fillText(labelText, width / 2, labelY + 17);

          // Draw Title text
          ctx.font = `900 ${width * 0.045}px system-ui, -apple-system, sans-serif`;
          ctx.fillText(selectedAlt.title_copy, width / 2, height * 0.16);

          // Draw Tagline text
          ctx.font = `bold ${width * 0.022}px system-ui, -apple-system, sans-serif`;
          ctx.fillStyle = canvasTextColor;
          ctx.globalAlpha = 0.75;
          ctx.fillText(selectedAlt.tagline_copy, width / 2, height * 0.21);
          ctx.globalAlpha = 1.0;

          // Draw Price Badge with custom discounts
          const priceBadgeY = imageY + imageHeight + 45;
          const match = selectedAlt.price_display.match(/(Rp\s*[\d.]+)(?:\s*(?:\(|Coret\s*)\s*(?:Rp\s*)?([\d.]+)\)?)/i);
          
          if (match) {
            const discounted = match[1];
            const original = match[2];

            // Original price text (strikethrough)
            ctx.fillStyle = canvasTextColor;
            ctx.globalAlpha = 0.5;
            ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
            const originalText = `Rp ${original}`;
            ctx.fillText(originalText, width / 2, priceBadgeY - 14);

            const origTextWidth = ctx.measureText(originalText).width;
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(width / 2 - origTextWidth / 2 - 4, priceBadgeY - 14);
            ctx.lineTo(width / 2 + origTextWidth / 2 + 4, priceBadgeY - 14);
            ctx.stroke();
            ctx.globalAlpha = 1.0;

            // Discounted price card
            ctx.fillStyle = canvasAccentColor;
            ctx.font = "900 28px system-ui, -apple-system, sans-serif";
            const priceWidth = ctx.measureText(discounted).width + 60;
            const priceHeight = 62;
            const priceX = (width - priceWidth) / 2;

            drawRoundedRect(ctx, priceX, priceBadgeY + 14, priceWidth, priceHeight, 31);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.fillText(discounted, width / 2, priceBadgeY + 14 + priceHeight / 2);
          } else {
            // Standard Price tag
            ctx.fillStyle = canvasAccentColor;
            ctx.font = "900 30px system-ui, -apple-system, sans-serif";
            const priceText = selectedAlt.price_display;
            const priceWidth = ctx.measureText(priceText).width + 60;
            const priceHeight = 64;
            const priceX = (width - priceWidth) / 2;

            drawRoundedRect(ctx, priceX, priceBadgeY, priceWidth, priceHeight, 32);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.fillText(priceText, width / 2, priceBadgeY + priceHeight / 2);
          }

          // Draw Footer line
          const footerY = height - 85;
          ctx.fillStyle = canvasTextColor;
          ctx.font = "bold 21px system-ui, -apple-system, sans-serif";
          ctx.textAlign = 'left';
          ctx.fillText(`Hubungi: ${contact || '@warung_bucici'}`, width * 0.12, footerY);

          // Draw CTA Button
          ctx.textAlign = 'right';
          const ctaText = selectedAlt.cta_copy.toUpperCase();
          ctx.font = "900 21px system-ui, -apple-system, sans-serif";
          const ctaWidth = ctx.measureText(ctaText).width + 36;
          const ctaHeight = 46;
          const ctaX = width * 0.88 - ctaWidth;

          ctx.fillStyle = canvasTextColor;
          ctx.globalAlpha = 0.08;
          drawRoundedRect(ctx, ctaX, footerY - 23, ctaWidth, ctaHeight, 12);
          ctx.fill();
          ctx.globalAlpha = 1.0;

          ctx.fillStyle = canvasTextColor;
          ctx.textAlign = 'center';
          ctx.fillText(ctaText, ctaX + ctaWidth / 2, footerY);
        }

        // 6. Save download payload
        const dataUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement('a');
        downloadLink.download = `poster_upgrade_${title.trim().replace(/\s+/g, '_') || 'bucici'}.png`;
        downloadLink.href = dataUrl;
        downloadLink.click();
        setDownloading(false);
      };

      productImg.onerror = () => {
        // Fallback draw text if image fails to load
        ctx.fillStyle = '#f87171';
        ctx.fillRect(imageX, imageY, imageWidth, imageHeight);
        ctx.fillStyle = '#ffffff';
        ctx.font = "bold 20px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("Format gambar tidak didukung", width / 2, imageY + imageHeight / 2);
        
        // Exporter
        const dataUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement('a');
        downloadLink.download = `poster_upgrade_fallback.png`;
        downloadLink.href = dataUrl;
        downloadLink.click();
        setDownloading(false);
      };

    } catch (err) {
      console.error("Gagal mengekspor poster:", err);
      alert("Terjadi kesalahan saat rendering HD Poster. Pastikan format gambar sesuai.");
      setDownloading(false);
    }
  };

  // Download the segmented / background-removed foreground as transparent PNG
  const handleDownloadBackgroundRemoved = () => {
    try {
      setIsProcessingBg(true);
      // Run the segmentation on full resolution (HD)
      runRealSegmentation(removeBgImg, true)
        .then((segmentedDataUrl) => {
          const finalCanvas = document.createElement('canvas');
          const finalCtx = finalCanvas.getContext('2d');
          if (!finalCtx) {
            setIsProcessingBg(false);
            return;
          }

          const img = new Image();
          img.crossOrigin = "anonymous";
          img.referrerPolicy = "no-referrer";
          img.src = segmentedDataUrl;

          img.onload = () => {
            finalCanvas.width = img.naturalWidth || 800;
            finalCanvas.height = img.naturalHeight || 800;

            if (bgRemovalStyle === 'solid') {
              finalCtx.fillStyle = bgRemovalSolidColor;
              finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
            }

            finalCtx.drawImage(img, 0, 0);

            const dataUrl = finalCanvas.toDataURL("image/png");
            const link = document.createElement('a');
            link.download = `isolated_subject_${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
            setIsProcessingBg(false);
          };
        })
        .catch((err) => {
          console.error("Failed to generate HD segmentation for download:", err);
          alert("Gagal mengunduh gambar terisolasi. Silakan coba kembali.");
          setIsProcessingBg(false);
        });
    } catch (err) {
      console.error("Gagal mengunduh gambar terisolasi:", err);
      setIsProcessingBg(false);
    }
  };

  const renderPriceTag = (priceStr: string, textColor: string, accentColor: string) => {
    const match = priceStr.match(/(Rp\s*[\d.]+)(?:\s*(?:\(|Coret\s*)\s*(?:Rp\s*)?([\d.]+)\)?)/i);
    if (match) {
      const discounted = match[1];
      const original = match[2];
      return (
        <div className="flex flex-col items-center justify-center gap-1">
          <span className="text-[10px] line-through opacity-60 font-mono" style={{ color: textColor }}>
            Rp {original}
          </span>
          <span 
            className="inline-block py-1.5 px-5 rounded-full font-black text-xs sm:text-sm shadow-md animate-pulse" 
            style={{ backgroundColor: accentColor, color: '#ffffff' }}
          >
            {discounted}
          </span>
        </div>
      );
    }
    
    return (
      <div 
        className="inline-block py-1.5 px-5 rounded-full font-black text-xs sm:text-sm shadow-md" 
        style={{ backgroundColor: accentColor, color: '#ffffff' }}
      >
        {priceStr}
      </div>
    );
  };

  return (
    <div className="space-y-6" id="ruang_pemasaran_overhaul">
      
      {/* BRAND HEADER & DESCRIPTION */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-500 text-white text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest">
              AI MARKETING HUB
            </span>
            <span className="bg-emerald-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest flex items-center gap-1">
              <Sparkles size={9} />
              STUDIO PRO
            </span>
          </div>
          <h3 className="text-xl font-black mt-2 tracking-tight">Pemasaran AI & Studio Fotografi</h3>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed font-medium">
            Rombak visual produk Anda menjadi kampanye komersial kelas dunia. Gunakan model pemosisian
            fotografi profesional atau hilangkan latar belakang seketika untuk fokus pada keindahan produk.
          </p>
        </div>
      </div>

      {/* SUB-TAB NAVIGATOR (NO EMOJIS, HIGH-CONTRAST CHIPS) */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 w-full max-w-md border border-slate-200" id="ai_marketing_tab_navigator">
        <button
          type="button"
          id="tab_trigger_upgrade_poster"
          onClick={() => setCurrentTab('upgrade')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            currentTab === 'upgrade'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Camera size={13} />
          Upgrade Poster
        </button>
        <button
          type="button"
          id="tab_trigger_remove_bg"
          onClick={() => setCurrentTab('remove_bg')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            currentTab === 'remove_bg'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Scissors size={13} />
          Hapus Background
        </button>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* TAB A: UPGRADE POSTER                                                 */}
      {/* --------------------------------------------------------------------- */}
      {currentTab === 'upgrade' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="upgrade_poster_tab_workspace">
          
          {/* LEFT FORM FIELD CONTROLLERS */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                  <Sparkles size={14} className="text-blue-600" />
                  Konfigurasi Art Director AI
                </h4>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-bold">
                  Elite Mode
                </span>
              </div>

              {products && products.length > 0 && (
                <div className="bg-blue-50/50 border border-blue-100/60 p-3 rounded-xl space-y-1.5">
                  <label className="text-[9px] font-black text-blue-800 uppercase tracking-wide flex items-center gap-1">
                    <Layers size={11} className="text-blue-600" />
                    PRE-SET DARI PRODUK TOKO
                  </label>
                  <select
                    id="poster_product_picker_overhaul"
                    className="w-full p-2 bg-white border border-blue-200 rounded-lg text-slate-700 focus:outline-none text-[11px] font-bold cursor-pointer"
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (selectedId) {
                        const selectedProd = products.find(p => String(p.id || p.prod_id) === selectedId);
                        if (selectedProd) {
                          setTitle(selectedProd.name || '');
                          setPrice(`Rp ${Number(selectedProd.price || 0).toLocaleString('id-ID')}`);
                          setTagline(`Spesial penawaran ${selectedProd.name} cita rasa premium!`);
                          setContact('@warung_bucici');
                          setCta('Beli Sekarang!');
                        }
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">-- Pilih produk terdaftar --</option>
                    {products.map((p, idx) => (
                      <option key={p.id || p.prod_id || idx} value={String(p.id || p.prod_id)}>
                        {p.name} (Rp {Number(p.price || 0).toLocaleString('id-ID')})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <form onSubmit={handleGenerate} className="space-y-3.5 text-xs text-slate-700">
                
                {/* UPLOADER FOTO RAW PRODUK */}
                <div className="space-y-1.5 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Foto Raw Produk Utama</label>
                  <div className="flex items-center gap-3">
                    {canvasImg ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-sm relative">
                        <img src={canvasImg} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                        <ImageIcon size={18} />
                      </div>
                    )}
                    <div className="flex-1 flex gap-1.5">
                      <button
                        type="button"
                        onClick={triggerFileInput}
                        className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1"
                      >
                        <Upload size={11} />
                        Unggah Foto
                      </button>
                      <button
                        type="button"
                        onClick={handleMockUpload}
                        className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] rounded-lg cursor-pointer transition-all"
                      >
                        Demo
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Nama Produk / Topik Utama *</label>
                  <input
                    id="poster_input_title"
                    type="text"
                    placeholder="Mis. Kopi Susu Aren Gula Jawa"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-slate-300 text-slate-800"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Slogan / Tagline Pendukung</label>
                  <input
                    id="poster_input_tagline"
                    type="text"
                    placeholder="Mis. Nikmatnya Kopi Asli dari Biji Pilihan"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-300 text-slate-800"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Harga Diskon / Promo</label>
                    <input
                      id="poster_input_price"
                      type="text"
                      placeholder="Rp 15.000 (Coret Rp 20.000)"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-slate-300 text-slate-800"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Gaya Studio</label>
                    <select
                      id="poster_input_style"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-slate-300 text-slate-800 cursor-pointer"
                      value={style}
                      onChange={(e: any) => setStyle(e.target.value)}
                    >
                      <option value="Minimalist">Minimalis Bersih</option>
                      <option value="Bold">Cetak Tebal (Bold)</option>
                      <option value="Soft">Warna Pastel Lembut</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Instagram / Kontak</label>
                    <input
                      id="poster_input_contact"
                      type="text"
                      placeholder="@kopi_bucici"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-300 text-slate-800"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Tombol Aksi (CTA)</label>
                    <input
                      id="poster_input_cta"
                      type="text"
                      placeholder="Serbu Sekarang!"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-slate-300 text-slate-800"
                      value={cta}
                      onChange={(e) => setCta(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Catatan Ambience & Pencahayaan</label>
                  <input
                    id="poster_input_ambience"
                    type="text"
                    placeholder="Pencahayaan hangat dan cerah, latar belakang kayu estetik"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-300 text-[11px] text-slate-800"
                    value={ambience}
                    onChange={(e) => setAmbience(e.target.value)}
                  />
                </div>

                <button
                  id="poster_calculate_button"
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-950 disabled:bg-slate-200 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer mt-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      Memproses Pemosisian Komersial...
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      Kalkulasi AI Studio Photography
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* ART DIRECTOR LAYOUTS SUGGESTION CHIPS */}
            {alternatives.length > 0 && (
              <div className="space-y-3" id="poster_layout_alternatives">
                <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
                  Hasil Rekomendasi Studio Copywriter & Art Director:
                </span>
                <div className="space-y-2">
                  {alternatives.map((alt, i) => {
                    const isSelected = selectedAlt?.alternative_name === alt.alternative_name;
                    return (
                      <div
                        key={i}
                        id={`poster_layout_card_${i}`}
                        onClick={() => loadAlternativeToCanvas(alt)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-blue-50/40 border-blue-400 shadow-sm' 
                            : 'bg-white border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-black text-slate-800">{alt.alternative_name}</span>
                          {isSelected && <span className="text-[10px] text-blue-600 font-extrabold flex items-center gap-1 bg-blue-100/50 px-2 py-0.5 rounded">Active</span>}
                        </div>
                        <p className="text-[11px] text-slate-600 font-bold">"{alt.title_copy}"</p>
                        <p className="text-[10px] text-slate-400 leading-normal mt-0.5">{alt.layout_description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MOVED STUDIO CONFIGURATION CONTROLS */}
            {selectedAlt && (
              <div className="space-y-4">
                
                {/* ADVANCED RATIO SELECTOR */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Rasio Dimensi Studio (Aspect Ratio)
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: '4/5', label: 'Instagram', desc: '4:5 Feed' },
                      { id: '1/1', label: 'Square', desc: 'Marketplace' },
                      { id: '9/16', label: 'Reels / Story', desc: '9:16 Portrait' },
                      { id: '16/9', label: 'Banner', desc: '16:9 Land' },
                    ].map((ratio) => (
                      <button
                        key={ratio.id}
                        type="button"
                        onClick={() => setDesignRatio(ratio.id as any)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          designRatio === ratio.id
                            ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                            : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <div className="text-xs font-black">{ratio.id === '4/5' ? '4:5' : ratio.id === '1/1' ? '1:1' : ratio.id === '9/16' ? '9:16' : '16:9'}</div>
                        <div className="text-[8px] font-bold opacity-80 leading-none mt-0.5">{ratio.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* STUDIO PHOTOGRAPHER CONTROLLER */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Palette size={11} />
                      Parameter Pencahayaan & Layer
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-1">Pencahayaan Studio</label>
                      <select
                        id="studio_select_lighting"
                        value={lighting}
                        onChange={(e: any) => setLighting(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[11px] focus:outline-none cursor-pointer text-slate-700"
                      >
                        <option value="sunset">Sunset Warm Glow</option>
                        <option value="soft">Soft Diffused Box</option>
                        <option value="rim">Dramatic Rim Light</option>
                        <option value="neon">Cyberpunk Neon</option>
                        <option value="sunbeam">Natural Sunbeams</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-1">Kualitas Ekspor HD</label>
                      <select
                        id="studio_select_quality"
                        value={quality}
                        onChange={(e: any) => setQuality(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[11px] focus:outline-none cursor-pointer text-slate-700"
                      >
                        <option value="studio">Studio Pro (Ultra HD)</option>
                        <option value="ultra">4K Cinema Detail</option>
                        <option value="standard">Standard Web-Ready</option>
                      </select>
                    </div>
                  </div>

                  {/* TYPOGRAPHY OVERLAY PREVIEW */}
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                    <div>
                      <span className="text-[10px] font-black text-slate-700 block">Tampilkan Teks Overlay</span>
                      <span className="text-[9px] text-slate-400 font-medium">Aktifkan tulisan / slogan poster</span>
                    </div>
                    <button
                      type="button"
                      id="toggle_overlay_switch"
                      onClick={() => setShowOverlay(!showOverlay)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                        showOverlay 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {showOverlay ? <Eye size={12} /> : <EyeOff size={12} />}
                      {showOverlay ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>

                {/* COLOR TUNER */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-3">
                  <span className="text-[10px] font-black text-slate-500 block uppercase tracking-wider">
                    Modifikasi Palet Warna Poster (Live)
                  </span>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 block mb-1">Latar (BG)</label>
                      <input 
                        id="poster_color_bg"
                        type="color" 
                        className="w-full h-8 rounded-lg cursor-pointer border border-slate-100" 
                        value={canvasBg} 
                        onChange={(e) => setCanvasBg(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 block mb-1">Tulisan (Text)</label>
                      <input 
                        id="poster_color_text"
                        type="color" 
                        className="w-full h-8 rounded-lg cursor-pointer border border-slate-100" 
                        value={canvasTextColor} 
                        onChange={(e) => setCanvasTextColor(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 block mb-1">Sorotan (Accent)</label>
                      <input 
                        id="poster_color_accent"
                        type="color" 
                        className="w-full h-8 rounded-lg cursor-pointer border border-slate-100" 
                        value={canvasAccentColor} 
                        onChange={(e) => setCanvasAccentColor(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                {/* DOWNLOAD EXPORTER AND SHARE ACTIONS */}
                <div className="flex gap-2.5">
                  <button
                    id="upgrade_poster_download_btn"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-950 disabled:bg-slate-300 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    {downloading ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        Rendering Ultra-HD...
                      </>
                    ) : (
                      <>
                        <Download size={13} />
                        Unduh Poster (PNG)
                      </>
                    )}
                  </button>
                  <button
                    id="upgrade_poster_whatsapp_btn"
                    onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Halo! Ayo mampir ke toko kami! Lihat produk premium kami: ${selectedAlt.title_copy}. Segera hubungi kami untuk pemesanan!`)}`, '_blank')}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <Share2 size={13} />
                    Share
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* RIGHT POSTER INTERACTIVE PREVIEW PANEL - Murni Full-Bleed Canvas */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center w-full min-h-[500px]">
            
            {selectedAlt ? (
              <div className="w-full flex justify-center items-center">
                
                {/* STUDIO CANVAS CONTAINER FRAME */}
                <div 
                  className={`w-full rounded-2xl shadow-2xl overflow-hidden p-8 flex flex-col justify-between border-0 relative transition-all duration-300 ${
                    designRatio === '1/1' ? 'aspect-square max-w-lg' :
                    designRatio === '9/16' ? 'aspect-[9/16] max-h-[85vh] max-w-[380px]' :
                    designRatio === '16/9' ? 'aspect-[16/9] max-w-2xl' :
                    'aspect-[4/5] max-w-md'
                  }`}
                  style={{ backgroundColor: canvasBg }}
                  id="upgrade_poster_interactive_frame"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleRealUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />

                  {/* Visual lighting backdrops */}
                  {selectedAlt.alternative_name === "Mewah / Premium" || lighting === 'rim' || lighting === 'sunset' ? (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10 pointer-events-none z-0" />
                      <div 
                        className="absolute inset-0 pointer-events-none z-0 opacity-40 mix-blend-screen" 
                        style={{ 
                          background: lighting === 'sunset' 
                            ? 'radial-gradient(circle at 50% 50%, #fdba7440 0%, transparent 80%)'
                            : `radial-gradient(circle at 50% 50%, ${canvasAccentColor}38 0%, transparent 80%)` 
                        }} 
                      />
                      <div className="absolute inset-4 border border-amber-500/15 rounded-2xl pointer-events-none z-0" />
                    </>
                  ) : selectedAlt.alternative_name === "Gaya Bold Modern" ? (
                    <>
                      <div className="absolute top-0 left-0 w-full h-3.5 pointer-events-none z-0" style={{ backgroundColor: canvasAccentColor }} />
                      <div className="absolute top-8 left-8 w-14 h-14 border-l-4 border-t-4 opacity-25 pointer-events-none z-0" style={{ borderColor: canvasTextColor }} />
                      <div className="absolute bottom-8 right-8 w-14 h-14 border-r-4 border-b-4 opacity-25 pointer-events-none z-0" style={{ borderColor: canvasAccentColor }} />
                    </>
                  ) : (
                    <>
                      <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-20 pointer-events-none z-0" style={{ backgroundColor: canvasAccentColor }} />
                      <div className="absolute bottom-0 left-0 w-24 h-24 rounded-tr-full opacity-10 pointer-events-none z-0" style={{ backgroundColor: canvasTextColor }} />
                    </>
                  )}

                  {/* TOP ROW CONTENT (Typography Overlay) */}
                  <div className={`text-center space-y-1.5 z-10 transition-all duration-300 ${showOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <span className="text-[9px] uppercase tracking-wider font-black px-3.5 py-1 rounded-full bg-white/50 backdrop-blur-md shadow-sm inline-block" style={{ color: canvasTextColor }}>
                      KAMPANYE KOMERSIAL RESMI
                    </span>
                    <h3 className="text-lg sm:text-2xl font-black tracking-tight leading-tight uppercase mt-2" style={{ color: canvasTextColor }}>
                      {selectedAlt.title_copy}
                    </h3>
                    <p className="text-[10px] sm:text-xs font-bold max-w-xs mx-auto leading-relaxed" style={{ color: canvasTextColor, opacity: 0.85 }}>
                      {selectedAlt.tagline_copy}
                    </p>
                  </div>

                  {/* MIDDLE ROW CONTENT: PRODUCT FRAME WITH STUDIO SHADOWS */}
                  <div className="my-4 flex-1 flex items-center justify-center relative min-h-[140px] z-10">
                    {canvasImg ? (
                      <div className="w-full h-full max-h-[180px] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/60 relative">
                        <img src={canvasImg} alt="Komersial Produk" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-full h-full max-h-[140px] border-2 border-dashed border-slate-300/40 rounded-2xl flex flex-col items-center justify-center p-3 bg-white/10 text-slate-200 gap-2">
                        <ImageIcon size={20} className="stroke-1" />
                        <span className="text-[10px] font-bold text-center">Belum ada Foto Produk</span>
                      </div>
                    )}
                  </div>

                  {/* BOTTOM ROW CONTENT (Typography Overlay) */}
                  <div className={`text-center space-y-3 z-10 transition-all duration-300 ${showOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    {selectedAlt.price_display && renderPriceTag(selectedAlt.price_display, canvasTextColor, canvasAccentColor)}

                    <div className="flex justify-between items-center border-t border-slate-900/10 pt-2 text-[9px] font-black" style={{ color: canvasTextColor }}>
                      <span>Hubungi: {contact || '@warung_bucici'}</span>
                      <span className="bg-white/50 px-2.5 py-1 rounded-lg font-black uppercase tracking-wider shadow-sm">{selectedAlt.cta_copy}</span>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center max-w-sm p-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
                <Layers size={40} className="mb-2 stroke-1 text-slate-300" />
                <p className="text-xs font-bold text-slate-500">Poster Canvas Belum Siap</p>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                  Ketik konfigurasi promo di kiri lalu klik tombol "Kalkulasi AI Studio Photography" untuk memuat pratinjau studio!
                </p>
              </div>
            )}

          </div>

        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB B: HAPUS BACKGROUND (OVERHAUL REMOVE BACKGROUND)                  */}
      {/* --------------------------------------------------------------------- */}
      {currentTab === 'remove_bg' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="remove_bg_tab_workspace">
          
          {/* LEFT COLUMN: FILE UPLOAD AND PARAMETERS */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                  <Scissors size={14} className="text-rose-500" />
                  Konfigurasi Segmentasi AI & Crop
                </h4>
                <span className="text-[10px] text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full font-bold">
                  Borders Pro
                </span>
              </div>

              {/* DRAG AND DROP MANUAL FILE UPLOAD BOX */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
                  Unggah Gambar Produk Baru:
                </label>
                
                <input 
                  type="file" 
                  ref={bgRemoveFileInputRef} 
                  onChange={handleBgRemoveUpload} 
                  accept="image/*" 
                  className="hidden" 
                />

                <div 
                  onClick={triggerBgRemoveFileInput}
                  className="border-2 border-dashed border-slate-200 hover:border-rose-300 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-all group"
                  id="drag_drop_remove_bg_zone"
                >
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-500 transition-colors">
                      <Upload size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">Tarik gambar ke sini atau klik</p>
                      <p className="text-[10px] text-slate-400 mt-1 leading-normal">Mendukung file PNG, JPEG, WEBP hingga ukuran 10MB</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* EDGE SMOOTHING AND CROP TUNING CONTROL SLIDERS */}
              <div className="space-y-4 pt-2">
                <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
                  Parameter AI Edge Segmentasi (Lasso Adjust):
                </span>

                {/* Segmentor shape options */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 block">Bentuk Segmentasi Gunting</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'ellipse', label: 'Oval Elips' },
                      { id: 'rounded', label: 'Kotak Halus' },
                      { id: 'circle', label: 'Lingkaran' }
                    ].map((shape) => (
                      <button
                        key={shape.id}
                        type="button"
                        onClick={() => setLassoShape(shape.id as any)}
                        className={`py-1.5 px-2.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all text-center ${
                          lassoShape === shape.id
                            ? 'bg-rose-500 border-rose-500 text-white'
                            : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {shape.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feather blurring */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-500">Edge Feathering (Haluskan Pinggiran)</span>
                    <span className="text-slate-800 font-mono font-black">{featherRadius}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="10" 
                    value={featherRadius} 
                    onChange={(e) => setFeatherRadius(Number(e.target.value))} 
                    className="w-full h-1.5 bg-slate-100 rounded-lg cursor-pointer accent-rose-500"
                  />
                </div>

                {/* Threshold Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-500">Sensitivitas Deteksi AI (Threshold)</span>
                    <span className="text-slate-800 font-mono font-black">{bgThreshold}</span>
                  </div>
                  <input 
                    type="range" 
                    min="5" 
                    max="150" 
                    value={bgThreshold} 
                    onChange={(e) => setBgThreshold(Number(e.target.value))} 
                    className="w-full h-1.5 bg-slate-100 rounded-lg cursor-pointer accent-rose-500"
                    id="slider_bg_threshold"
                  />
                </div>

                {/* Key Color Picker Mode */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 block">Metode Deteksi Warna Latar</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      id="btn_key_mode_auto"
                      onClick={() => setKeyColorMode('auto')}
                      className={`py-1.5 px-2.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all text-center ${
                        keyColorMode === 'auto'
                          ? 'bg-rose-500 border-rose-500 text-white'
                          : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Otomatis (Pojok)
                    </button>
                    <button
                      type="button"
                      id="btn_key_mode_custom"
                      onClick={() => setKeyColorMode('custom')}
                      className={`py-1.5 px-2.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all text-center ${
                        keyColorMode === 'custom'
                          ? 'bg-rose-500 border-rose-500 text-white'
                          : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Pilih Manual
                    </button>
                  </div>
                </div>

                {keyColorMode === 'custom' && (
                  <div className="flex items-center gap-2 p-2 bg-rose-50/50 rounded-xl border border-rose-100 animate-in fade-in slide-in-from-top-1">
                    <label className="text-[9px] font-bold text-rose-800">Warna Latar Dibuang:</label>
                    <input 
                      type="color" 
                      id="input_custom_key_color"
                      value={customKeyColor} 
                      onChange={(e) => setCustomKeyColor(e.target.value)} 
                      className="w-7 h-7 rounded cursor-pointer border border-slate-200" 
                    />
                    <span className="text-[10px] font-mono font-black text-rose-900">{customKeyColor.toUpperCase()}</span>
                  </div>
                )}

                {/* Lasso width */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-500">Lebar Lasso Pemotongan</span>
                    <span className="text-slate-800 font-mono font-black">{lassoWidth}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={lassoWidth} 
                    onChange={(e) => setLassoWidth(Number(e.target.value))} 
                    className="w-full h-1.5 bg-slate-100 rounded-lg cursor-pointer accent-rose-500"
                  />
                </div>

                {/* Lasso height */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-500">Tinggi Lasso Pemotongan</span>
                    <span className="text-slate-800 font-mono font-black">{lassoHeight}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={lassoHeight} 
                    onChange={(e) => setLassoHeight(Number(e.target.value))} 
                    className="w-full h-1.5 bg-slate-100 rounded-lg cursor-pointer accent-rose-500"
                  />
                </div>

                {/* Lasso X offset */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-500">Geser Horizontal Lasso (Sumbu X)</span>
                    <span className="text-slate-800 font-mono font-black">{lassoX}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="90" 
                    value={lassoX} 
                    onChange={(e) => setLassoX(Number(e.target.value))} 
                    className="w-full h-1.5 bg-slate-100 rounded-lg cursor-pointer accent-rose-500"
                  />
                </div>

                {/* Lasso Y offset */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-500">Geser Vertikal Lasso (Sumbu Y)</span>
                    <span className="text-slate-800 font-mono font-black">{lassoY}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="90" 
                    value={lassoY} 
                    onChange={(e) => setLassoY(Number(e.target.value))} 
                    className="w-full h-1.5 bg-slate-100 rounded-lg cursor-pointer accent-rose-500"
                  />
                </div>

                {/* Output Backdrop preferences */}
                <div className="space-y-2 pt-2 border-t border-slate-50">
                  <span className="text-[9px] font-black text-slate-400 block">Latar Belakang Output</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 cursor-pointer">
                      <input 
                        type="radio" 
                        name="output_bg" 
                        checked={bgRemovalStyle === 'transparent'} 
                        onChange={() => setBgRemovalStyle('transparent')}
                        className="accent-rose-500 cursor-pointer"
                      />
                      Transparent Grid
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 cursor-pointer">
                      <input 
                        type="radio" 
                        name="output_bg" 
                        checked={bgRemovalStyle === 'solid'} 
                        onChange={() => setBgRemovalStyle('solid')}
                        className="accent-rose-500 cursor-pointer"
                      />
                      Warna Solid Neutral
                    </label>
                  </div>

                  {bgRemovalStyle === 'solid' && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-100">
                      <label className="text-[9px] font-bold text-slate-400">Pilih Warna BG:</label>
                      <input 
                        type="color" 
                        value={bgRemovalSolidColor} 
                        onChange={(e) => setBgRemovalSolidColor(e.target.value)} 
                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200" 
                      />
                      <span className="text-[10px] font-mono font-bold text-slate-600">{bgRemovalSolidColor.toUpperCase()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION EXECUTE BUTTONS */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  id="btn_trigger_segmentation"
                  onClick={triggerSegmentation}
                  disabled={isProcessingBg}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-950 disabled:bg-slate-200 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isProcessingBg ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      Mendeteksi Subjek...
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} className="text-yellow-400" />
                      Segera Jalankan Segmentasi AI
                    </>
                  )}
                </button>
                <button
                  type="button"
                  id="btn_reset_segmentation"
                  onClick={resetBgRemoval}
                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl border border-slate-200 cursor-pointer"
                  title="Reset Pemotongan"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: BEFORE & AFTER SLIDER COMPARATIVE PREVIEW */}
          <div className="lg:col-span-7 bg-slate-100 rounded-3xl p-6 border border-slate-200/60 flex flex-col items-center justify-between gap-5 min-h-[500px]">
            
            <div className="w-full max-w-sm space-y-4">
              <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <span>Visualizer Latar Belakang</span>
                <span className="text-rose-500 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded">
                  <Sliders size={10} />
                  Slide Slider untuk Membandingkan
                </span>
              </div>

              {/* COMPARATIVE BEFORE/AFTER SLIDER BOX */}
              <div className="relative w-full aspect-square bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                
                {/* BEFORE LAYER (Background + Foreground Original) */}
                <img 
                  src={removeBgImg} 
                  className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none" 
                  alt="Original Raw" 
                />

                {/* FOCUS AREA LASSO VISUAL GUIDE (Highlights the selected region for AI) */}
                <div 
                  className="absolute pointer-events-none z-20 transition-all overflow-hidden inset-0"
                >
                  <div 
                    className="absolute border-2 border-dashed border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] transition-all"
                    style={{
                      left: `${lassoX - lassoWidth / 2}%`,
                      top: `${lassoY - lassoHeight / 2}%`,
                      width: `${lassoWidth}%`,
                      height: `${lassoHeight}%`,
                      borderRadius: lassoShape === 'circle' ? '50%' : lassoShape === 'rounded' ? '24px' : '50%',
                    }}
                  />
                </div>

                {/* SCANNING LASER LINE (Only visible while processing background removal) */}
                {isProcessingBg && (
                  <div className="absolute inset-x-0 h-1.5 bg-rose-500/80 shadow-[0_0_12px_#f43f5e] z-30 animate-pulse top-0" style={{
                    animation: 'scan-laser 1.5s infinite linear'
                  }} />
                )}

                {/* AFTER LAYER (Isolated foreground cutout on checkered or solid background) */}
                <div 
                  className="absolute inset-0 overflow-hidden select-none pointer-events-none transition-all duration-75 z-10"
                  style={{ 
                    clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
                    // Elegant CSS grid pattern representing transparency grid
                    backgroundImage: bgRemovalStyle === 'transparent' 
                      ? "radial-gradient(#cbd5e1 1.5px, transparent 1.5px), radial-gradient(#cbd5e1 1.5px, #f8fafc 1.5px)" 
                      : 'none',
                    backgroundSize: "16px 16px",
                    backgroundPosition: "0 0, 8px 8px",
                    backgroundColor: bgRemovalStyle === 'solid' ? bgRemovalSolidColor : 'transparent'
                  }}
                >
                  <img 
                    src={processedBgImg || removeBgImg} 
                    className="absolute inset-0 w-full h-full object-cover" 
                    alt="After Cutout" 
                  />
                </div>

                {/* SLIDER DIVISION BAR */}
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 shadow-[0_0_15px_rgba(0,0,0,0.4)] flex items-center justify-center transition-all duration-75"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white shadow-2xl flex items-center justify-center border border-slate-700 select-none active:scale-95 transition-all">
                    <Sliders size={13} className="rotate-90" />
                  </div>
                </div>

                {/* HIDDEN TRANSPARENT RANGE INPUT TO DRAG THE SLIDER */}
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={sliderPosition} 
                  onChange={(e) => setSliderPosition(Number(e.target.value))} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30" 
                />

                {/* Visual Label Chips */}
                <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white font-extrabold text-[8px] px-2.5 py-1 rounded-full uppercase tracking-wider z-10">
                  Sebelum (Raw)
                </span>
                <span className="absolute top-3 right-3 bg-rose-600 text-white font-extrabold text-[8px] px-2.5 py-1 rounded-full uppercase tracking-wider z-10">
                  AI Segmen (Sesudah)
                </span>
              </div>

              {/* ACTION EXPORTERS */}
              <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    AI berhasil mengidentifikasi detail subjek utama produk. Anda dapat mengatur 
                    geser lasso dan kehalusan sudut untuk potongan yang paling rapi!
                  </p>
                </div>
                
                <button
                  type="button"
                  id="btn_download_foreground_only"
                  onClick={handleDownloadBackgroundRemoved}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Download size={13} />
                  Unduh Subjek Terisolasi (PNG)
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* Embedded CSS for Background Removal Scan Laser Animation */}
      <style>{`
        @keyframes scan-laser {
          0% { top: 0%; opacity: 0.8; }
          50% { top: 100%; opacity: 1; }
          100% { top: 0%; opacity: 0.8; }
        }
      `}</style>
      
    </div>
  );
}
