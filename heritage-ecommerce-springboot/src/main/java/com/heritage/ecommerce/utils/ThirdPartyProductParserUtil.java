package com.heritage.ecommerce.utils;

import com.heritage.ecommerce.entity.ThirdPartyProductInfo;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Random;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class ThirdPartyProductParserUtil {

    private static final List<String> USER_AGENTS = Arrays.asList(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );

    private static final Random RANDOM = new Random();

    public ThirdPartyProductInfo parseJdUrl(String url) {
        return parseUrl(url, "jd");
    }

    public ThirdPartyProductInfo parseTbUrl(String url) {
        return parseUrl(url, "tb");
    }

    private ThirdPartyProductInfo parseUrl(String rawUrl, String platform) {
        if (!StringUtils.hasText(rawUrl)) {
            return ThirdPartyProductInfo.fail(platform, rawUrl, "400", "商品链接不能为空");
        }

        String normalizedUrl;
        try {
            normalizedUrl = normalizeUrl(rawUrl, platform);
        } catch (Exception e) {
            return ThirdPartyProductInfo.fail(platform, rawUrl, "400", "链接格式错误，无法识别商品链接");
        }

        try {
            String html = fetchPageHtml(normalizedUrl);
            if (html == null || html.trim().isEmpty()) {
                return ThirdPartyProductInfo.fail(platform, normalizedUrl, "404", "商品页面未返回有效内容");
            }

            if (html.contains("404") && (html.contains("页面不存在") || html.contains("not found") || html.contains("找不到该页面"))) {
                return ThirdPartyProductInfo.fail(platform, normalizedUrl, "404", "商品页面不存在或已删除");
            }
            if (isAntiBot(html)) {
                return ThirdPartyProductInfo.fail(platform, normalizedUrl, "403", "平台反爬拦截，暂时无法解析该商品");
            }
            if (html.contains("商品已下架") || html.contains("此商品已下架") || html.contains("已下架")) {
                return ThirdPartyProductInfo.fail(platform, normalizedUrl, "410", "商品已下架或不可售");
            }

            Document doc = Jsoup.parse(html, normalizedUrl);
            ThirdPartyProductInfo info = new ThirdPartyProductInfo();
            info.setSuccess(true);
            info.setSourcePlatform(platform);
            info.setRawUrl(normalizedUrl);
            info.setSourceProductId(extractSourceProductId(normalizedUrl, platform));
            info.setTitle(extractTitle(doc, platform));
            info.setPrice(extractPrice(doc, platform));
            info.setMainImages(extractMainImages(doc, platform));
            info.setDetailHtml(extractDetailHtml(doc, platform));
            info.setSpecs(extractSpecs(doc, platform));

            if (!StringUtils.hasText(info.getTitle())) {
                return ThirdPartyProductInfo.fail(platform, normalizedUrl, "400", "商品标题解析失败，页面结构异常");
            }
            if (info.getPrice() == null) {
                return ThirdPartyProductInfo.fail(platform, normalizedUrl, "400", "商品售价解析失败，页面数据缺失");
            }

            return info;
        } catch (IOException e) {
            return ThirdPartyProductInfo.fail(platform, normalizedUrl, "502", "商品抓取失败：网络请求异常");
        } catch (Exception e) {
            return ThirdPartyProductInfo.fail(platform, normalizedUrl, "500", "商品解析失败：" + e.getMessage());
        }
    }

    private String normalizeUrl(String rawUrl, String platform) {
        String url = rawUrl.trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }

        URI uri;
        try {
            uri = new URI(url);
        } catch (URISyntaxException e) {
            throw new IllegalArgumentException("非法链接");
        }

        if (platform.equals("jd") && !url.contains("jd.com") && !url.contains("jd.hk") && !url.contains("jd.cn")) {
            throw new IllegalArgumentException("非京东商品链接");
        }

        if (platform.equals("tb") && !url.contains("taobao.com") && !url.contains("tmall.com") && !url.contains("tb.cn") && !url.contains("1688.com")) {
            throw new IllegalArgumentException("非淘宝/天猫商品链接");
        }

        return normalizeShortLinkIfNeeded(url);
    }

    private String normalizeShortLinkIfNeeded(String url) {
        if (!url.contains("tb.cn") && !url.contains("m.tb.cn") && !url.contains("click.taobao.com") && !url.contains("detail.m.tmall.com")) {
            return url;
        }

        try {
            Connection connection = Jsoup.connect(url)
                    .userAgent(randomUserAgent())
                    .timeout(15000)
                    .followRedirects(true)
                    .ignoreHttpErrors(true);
            Connection.Response response = connection.execute();
            if (response.url() != null) {
                return response.url().toString();
            }
            return url;
        } catch (Exception e) {
            return url;
        }
    }

    private String fetchPageHtml(String url) throws IOException {
        sleepRandom();
        Connection connection = Jsoup.connect(url)
                .userAgent(randomUserAgent())
                .header("Accept-Language", "zh-CN,zh;q=0.9")
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
                .header("Upgrade-Insecure-Requests", "1")
                .timeout(20000)
                .followRedirects(true)
                .ignoreHttpErrors(true);

        Connection.Response response = connection.execute();
        int statusCode = response.statusCode();
        if (statusCode == 404) {
            throw new IOException("404");
        }
        if (statusCode >= 500) {
            throw new IOException("server_error");
        }
        return response.body();
    }

    private void sleepRandom() {
        try {
            Thread.sleep(800 + RANDOM.nextInt(1300));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private String randomUserAgent() {
        return USER_AGENTS.get(RANDOM.nextInt(USER_AGENTS.size()));
    }

    private String extractSourceProductId(String url, String platform) {
        String candidate = url;
        Pattern pattern = platform.equals("jd")
                ? Pattern.compile("(?:item\\.|product\\.|sku=|id=)(\\d{5,})")
                : Pattern.compile("(?:id=|itemId=|num_iid=|skuId=)(\\d{5,})");
        Matcher matcher = pattern.matcher(candidate);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    private String extractTitle(Document doc, String platform) {
        String title = selectFirstText(doc,
                "meta[property=og:title]",
                "meta[name=og:title]",
                "meta[itemprop=name]",
                "title",
                "h1");
        if (StringUtils.hasText(title)) {
            return title.replace("\n", "").trim();
        }
        if (platform.equals("jd")) {
            return selectFirstText(doc, ".sku-name", ".main-title");
        }
        return selectFirstText(doc, ".tb-main-title", ".title", ".item-name");
    }

    private BigDecimal extractPrice(Document doc, String platform) {
        String price = selectFirstAttribute(doc,
                "meta[property=og:price:amount]",
                "meta[name=price]",
                "meta[itemprop=price]");

        if (!StringUtils.hasText(price)) {
            price = findPriceInScript(doc.html());
        }
        if (!StringUtils.hasText(price)) {
            price = findPriceFromText(doc.text());
        }
        if (!StringUtils.hasText(price)) {
            return null;
        }

        String cleaned = price.replaceAll("[^"]?", "");
        cleaned = cleaned.replaceAll("[^ -\uFFFF&&[^0-9.]]", "");
        cleaned = cleaned.replaceAll("^0+", "");
        if (cleaned.isEmpty() || cleaned.equals(".")) {
            return null;
        }
        try {
            return new BigDecimal(cleaned);
        } catch (Exception e) {
            return null;
        }
    }

    private List<String> extractMainImages(Document doc, String platform) {
        Set<String> images = new TreeSet<>();

        String ogImage = selectFirstAttribute(doc, "meta[property=og:image]", "meta[name=og:image]");
        if (StringUtils.hasText(ogImage)) {
            images.add(ogImage);
        }

        Elements imgs = doc.select("img");
        for (Element img : imgs) {
            String src = img.attr("data-src");
            if (!StringUtils.hasText(src)) {
                src = img.attr("src");
            }
            if (!StringUtils.hasText(src)) {
                src = img.attr("data-lazy-img");
            }
            if (StringUtils.hasText(src) && (src.contains(".jpg") || src.contains(".jpeg") || src.contains(".png") || src.contains(".webp"))) {
                images.add(src);
            }
        }

        return new ArrayList<>(images);
    }

    private String extractDetailHtml(Document doc, String platform) {
        Elements candidateSelectors = new Elements();
        candidateSelectors.addAll(doc.select("#detail, #J_Detail, .detail-content, .tm-detail, .item-description, .desc, .detail"));
        if (candidateSelectors.isEmpty()) {
            return doc.body() == null ? "" : doc.body().html();
        }
        Element target = null;
        for (Element e : candidateSelectors) {
            if (e.text().length() > 20) {
                target = e;
                break;
            }
        }
        return target == null ? doc.body().html() : target.outerHtml();
    }

    private Map<String, String> extractSpecs(Document doc, String platform) {
        Map<String, String> specs = new LinkedHashMap<>();

        Elements listNodes = doc.select("#J_AttrUL li, .parameter-list li, .Ptable li, .spec-item li, .attrs li");
        if (!listNodes.isEmpty()) {
            for (Element li : listNodes) {
                String text = li.text();
                if (text == null || text.length() < 3) {
                    continue;
                }
                int pos = text.indexOf('：');
                if (pos < 0) {
                    pos = text.indexOf(':');
                }
                if (pos > 0) {
                    specs.put(text.substring(0, pos).trim(), text.substring(pos + 1).trim());
                }
            }
        }

        if (specs.isEmpty()) {
            Elements tables = doc.select("table tr, .Ptable tr, .parameter tr");
            for (Element tr : tables) {
                Elements td = tr.select("td");
                if (td.size() >= 2) {
                    String key = td.get(0).text().trim();
                    String value = td.get(1).text().trim();
                    if (StringUtils.hasText(key) && StringUtils.hasText(value)) {
                        specs.put(key, value);
                    }
                }
            }
        }

        return specs;
    }

    private boolean isAntiBot(String html) {
        String text = html.toLowerCase();
        return text.contains("anti-bot")
                || text.contains("验证")
                || text.contains("sliding captcha")
                || text.contains("please wait")
                || text.contains("人机验证")
                || text.contains("安全验证")
                || text.contains("反爬")
                || text.contains("访问限制")
                || text.contains("www.taobao.com") && text.contains("login")
                || text.contains("https://login.tmall.com")
                || text.contains("保护站点");
    }

    private String selectFirstText(Document doc, String... selectors) {
        for (String selector : selectors) {
            Element element = doc.selectFirst(selector);
            if (element != null && StringUtils.hasText(element.text())) {
                return element.text();
            }
        }
        return null;
    }

    private String selectFirstAttribute(Document doc, String... selectors) {
        for (String selector : selectors) {
            Element element = doc.selectFirst(selector);
            if (element != null && StringUtils.hasText(element.attr("content"))) {
                return element.attr("content");
            }
            if (element != null && StringUtils.hasText(element.attr("value"))) {
                return element.attr("value");
            }
        }
        return null;
    }

    private String findPriceInScript(String html) {
        Matcher matcher = Pattern.compile("(?:price|promPrice|currentPrice|salePrice)[\\s\":=]+([0-9]+\\.[0-9]+|[0-9]+)").matcher(html);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    private String findPriceFromText(String text) {
        Matcher matcher = Pattern.compile("([0-9]+\\.[0-9]+|[0-9]+)").matcher(text);
        List<String> candidates = new ArrayList<>();
        while (matcher.find()) {
            candidates.add(matcher.group(1));
        }
        if (candidates.isEmpty()) {
            return null;
        }
        return candidates.get(0);
    }
}
