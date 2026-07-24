<script setup>
// 页脚：对标非遗官网的规整信息区
const columns = [
  {
    title: '关于我们',
    links: ['项目缘起', '数赋黔滇团队', '非遗数字化保护', '联系我们']
  },
  {
    title: '非遗传承',
    links: ['苗族技艺', '彝族技艺', '布依族技艺', '匠人名录']
  },
  {
    title: '购物指南',
    links: ['下单流程', '配送说明', '售后保障', '常见问题']
  }
]
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-top">
      <div class="footer-brand">
        <strong>数赋黔滇</strong>
        <p>以数字化之力守护西南少数民族非物质文化遗产，<br />让苗岭彝山布依水乡的器物之美活态传承。</p>
      </div>
      <div class="footer-cols">
        <div v-for="col in columns" :key="col.title" class="footer-col">
          <h4>{{ col.title }}</h4>
          <ul>
            <li v-for="link in col.links" :key="link">
              <a href="javascript:void(0)">{{ link }}</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="container">
        <p>© 2026 数赋黔滇 · 赴黔滇调研西南少数民族非遗器物数字化保护与电商赋能实践团队</p>
        <p class="tips">本站为大学生实践项目·电商模块，商品与数据均为教学演示用途</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  margin-top: auto;
  background: #f5f2ef; /* 宣纸暖灰 */
  color: var(--color-text-light);
  border-top: 1px solid var(--color-border);
}
.footer-top {
  display: flex;
  justify-content: space-between;
  gap: 40px;
  padding: 40px 20px 30px;
  flex-wrap: wrap;
}
.footer-brand strong {
  font-family: var(--font-title);
  font-size: 22px;
  color: var(--color-primary);
  letter-spacing: 3px;
}
.footer-brand p {
  margin-top: 12px;
  font-size: 13px;
  line-height: 1.9;
  max-width: 320px;
}
.footer-cols {
  display: flex;
  gap: 56px;
  flex-wrap: wrap;
}
.footer-col h4 {
  color: var(--color-text);
  font-size: 15px;
  margin-bottom: 14px;
  letter-spacing: 1px;
}
.footer-col li {
  margin-bottom: 9px;
}
.footer-col a {
  font-size: 13px;
  color: var(--color-text-light);
  transition: color 0.2s;
}
.footer-col a:hover {
  color: var(--color-accent);
}
.footer-bottom {
  border-top: 1px solid var(--color-border);
  padding: 16px 0;
  text-align: center;
  font-size: 12px;
}
.footer-bottom .tips {
  margin-top: 4px;
  color: var(--color-text-muted);
}
@media (max-width: 768px) {
  .footer-top {
    flex-direction: column;
    gap: 24px;
  }
  .footer-cols {
    gap: 32px;
  }
}
</style>
