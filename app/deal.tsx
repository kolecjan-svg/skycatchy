import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Share,
  Dimensions,
  Platform,
} from 'react-native';
import WebView from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
} from '../constants/theme';
import { dealPreviewStore } from '../lib/dealPreviewStore';
import { supabase } from '../lib/supabase';
import { useFavorites } from '../hooks/useFavorites';
import { formatPublishDate } from '../lib/formatters';
import { decodeHtmlEntities } from '../lib/htmlUtils';

const IMAGE_HEIGHT = Math.round(Dimensions.get('window').width * 0.58);
const SCREEN_WIDTH = Dimensions.get('window').width;

const EXTRACT_JS = `
(function() {
  var attempts = 0;
  var MAX_ATTEMPTS = 12;
  function extract() {
    try {
      // Remove noise elements
      ['script','style','nav','header','footer','aside','figure','iframe','noscript','form','button'].forEach(function(tag) {
        document.querySelectorAll(tag).forEach(function(el) { el.remove(); });
      });
      // Remove comment/discussion sections
      ['[class*="comment"]','[id*="comment"]','[class*="discuss"]','[id*="discuss"]',
       '[class*="respond"]','[id*="respond"]','[class*="koment"]','[id*="koment"]',
       '[class*="reakce"]','[class*="social"]','[class*="share"]','[class*="related"]',
       '[class*="newsletter"]','[class*="subscribe"]'].forEach(function(sel) {
        try { document.querySelectorAll(sel).forEach(function(el) { el.remove(); }); } catch(e) {}
      });
      var el = document.querySelector('article') ||
                document.querySelector('main') ||
                document.querySelector('[class*="post-content"]') ||
                document.querySelector('[class*="article-body"]') ||
                document.querySelector('[class*="entry-content"]') ||
                document.body;
      var text = (el ? el.innerText : '').trim();
      // Retry if content not ready yet (SPA still rendering)
      if (text.length < 300 && attempts < MAX_ATTEMPTS) {
        attempts++;
        setTimeout(extract, 500);
        return;
      }
      // Truncate at comment/discussion section dividers (case-insensitive)
      var stopWords = ['diskuze', 'komentáře', 'komentare', 'přidat komentář',
                       'comments', 'leave a reply', 'leave a comment', 'related posts', 'související',
                       'akční letenky', 'další nabídky', 'mohlo by vás zajímat'];
      var lowerText = text.toLowerCase();
      for (var i = 0; i < stopWords.length; i++) {
        var idx = lowerText.indexOf(stopWords[i]);
        if (idx > 300) { text = text.substring(0, idx).trim(); break; }
      }
      window.ReactNativeWebView.postMessage(JSON.stringify({ text: text }));
    } catch(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ text: '' }));
    }
  }
  extract();
  true;
})();
`;

export default function DealModal() {
  const router = useRouter();
  const deal = dealPreviewStore.get();
  const { favorites, toggle: toggleFavorite } = useFavorites();
  const webViewRef = useRef<WebView>(null);
  const [isFav, setIsFav] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [webContent, setWebContent] = useState<string | null>(null);

  const cachedContent = deal?.id ? dealPreviewStore.getCachedContent(deal.id) : null;
  // needsWebView = deal has no DB content and no in-memory cached content
  const needsWebView = !deal?.content && !cachedContent;

  useEffect(() => {
    if (!deal) { router.back(); return; }
    setIsFav(favorites.has(deal.id));
  }, []);

  const handleWebViewLoad = useCallback(() => {
    webViewRef.current?.injectJavaScript(EXTRACT_JS);
  }, []);

  const handleWebViewMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const { text } = JSON.parse(event.nativeEvent.data);
      const cleaned = (text ?? '')
        .split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 5)
        .join('\n\n');
      if (cleaned.length > 200 && cleaned.includes('\n\n')) {
        setWebContent(cleaned);
        const id = dealPreviewStore.get()?.id;
        if (id) {
          // Cache in memory so re-opening same deal is instant
          dealPreviewStore.cacheContent(id, cleaned);
          // Write-back to DB so next app launch is also instant
          supabase.from('deals').update({ content: cleaned }).eq('id', id).then(() => {});
        }
      }
    } catch {}
  }, []);

  const handleClose = useCallback(() => router.back(), [router]);

  const handleShare = useCallback(() => {
    if (!deal) return;
    Share.share({ url: deal.link, message: deal.name });
  }, [deal]);

  const handleFavorite = useCallback(() => {
    if (!deal) return;
    toggleFavorite(deal.id);
    setIsFav((prev) => !prev);
  }, [deal, toggleFavorite]);

  const handleOpenWeb = useCallback(() => {
    const url = deal?.link ?? '';
    if (!url.startsWith('http://') && !url.startsWith('https://')) return;
    Linking.openURL(url).catch(() => {});
  }, [deal]);

  if (!deal) return null;

  const title = decodeHtmlEntities(deal.name);
  const extractedContent = webContent ?? cachedContent ?? deal.content ?? null;
  const goodContent = extractedContent && extractedContent.length > 200 && extractedContent.includes('\n');
  const description = deal.description ? decodeHtmlEntities(deal.description) : null;
  const bodyText = goodContent ? extractedContent : (description || extractedContent) || null;
  const timeAgo = formatPublishDate(deal.publish_date);
  const hasImage = !!deal.image && !imageError;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Hidden WebView — only for deals without DB content (JS-rendered sites) */}
      {needsWebView && (
        <View style={styles.hiddenContainer}>
          <WebView
            ref={webViewRef}
            source={{ uri: deal.link }}
            style={{ width: SCREEN_WIDTH, height: 600 }}
            onLoadEnd={handleWebViewLoad}
            onMessage={handleWebViewMessage}
            onError={() => {}}
            javaScriptEnabled
            domStorageEnabled
            userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
          />
        </View>
      )}

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleClose}
          style={styles.iconBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.sourceLabel} numberOfLines={1}>{deal.source}</Text>

        <View style={styles.topRight}>
          <TouchableOpacity
            onPress={handleShare}
            style={styles.iconBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Share deal"
          >
            <Ionicons name="share-outline" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleFavorite}
            style={styles.iconBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={isFav ? 'Remove from favorites' : 'Save to favorites'}
          >
            <Ionicons
              name={isFav ? 'heart' : 'heart-outline'}
              size={22}
              color={isFav ? Colors.heartActive : Colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {hasImage ? (
          <Image
            source={{ uri: deal.image! }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="airplane" size={48} color={Colors.textTertiary} />
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.meta}>
            <View style={styles.sourceChip}>
              <Text style={styles.sourceText} numberOfLines={1}>{deal.source}</Text>
            </View>
            {timeAgo ? <Text style={styles.time}>{timeAgo}</Text> : null}
          </View>

          <Text style={styles.title}>{title}</Text>

          {bodyText ? (
            <Text style={styles.bodyText}>{bodyText}</Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={handleOpenWeb}
          activeOpacity={0.85}
          accessibilityRole="link"
          accessibilityLabel="Open original website"
        >
          <Text style={styles.ctaText}>Open website</Text>
          <Ionicons name="open-outline" size={18} color={Colors.white} style={styles.ctaIcon} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  hiddenContainer: {
    position: 'absolute',
    width: 0,
    height: 0,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  sourceLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginHorizontal: Spacing.xs,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  image: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: Colors.lightBg,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sourceChip: {
    backgroundColor: 'rgba(255, 122, 0, 0.09)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    maxWidth: '65%',
  },
  sourceText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.orange,
    letterSpacing: 0.2,
  },
  time: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    lineHeight: 28,
    marginBottom: Spacing.lg,
  },
  bodyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  bottomBar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? Spacing.sm : Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.orange,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 2,
  },
  ctaText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  ctaIcon: {
    marginLeft: Spacing.xs,
  },
});
