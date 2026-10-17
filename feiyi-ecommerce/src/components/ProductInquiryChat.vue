<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import request from '@/api/request'
import { useAuthStore } from '@/store/auth'

const route = useRoute()
const auth = useAuthStore()
const conversations = ref([])
const messages = ref([])
const activeConversation = ref(null)
const draft = ref('')
const loading = ref(false)
const sending = ref(false)
const error = ref('')
let conversationPoll
let messagePoll
let requestedConversationHandled = ''

const currentUserId = computed(() => String(auth.user?.id || ''))

async function loadConversations() {
  const result = await request.get('/conversations', { params: { product_only: true } })
  conversations.value = result
  const requestedId = Number(route.query.conversation)
  if (requestedId && requestedConversationHandled !== String(requestedId)) {
    const requested = result.find((conversation) => Number(conversation.id) === requestedId)
    if (requested) {
      requestedConversationHandled = String(requestedId)
      await openConversation(requested)
    }
  } else if (activeConversation.value) {
    activeConversation.value =
      result.find((conversation) => Number(conversation.id) === Number(activeConversation.value.id)) ||
      activeConversation.value
  }
}

async function openConversation(conversation) {
  activeConversation.value = conversation
  loading.value = true
  error.value = ''
  try {
    messages.value = await request.get(`/conversations/${conversation.id}/messages`)
  } catch (cause) {
    error.value = cause.response?.data?.error || '消息加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function refreshMessages() {
  if (!activeConversation.value || sending.value) return
  try {
    messages.value = await request.get(`/conversations/${activeConversation.value.id}/messages`)
  } catch (cause) {
    error.value = cause.response?.data?.error || '消息更新失败，请检查网络连接'
  }
}

async function sendMessage() {
  const content = draft.value.trim()
  if (!content || !activeConversation.value || sending.value) return
  sending.value = true
  error.value = ''
  try {
    await request.post(`/conversations/${activeConversation.value.id}/messages`, { content })
    draft.value = ''
    await refreshMessages()
    await loadConversations()
  } catch (cause) {
    error.value = cause.response?.data?.error || '消息发送失败，请稍后重试'
  } finally {
    sending.value = false
  }
}

watch(() => route.query.conversation, async () => {
  requestedConversationHandled = ''
  try {
    await loadConversations()
  } catch (cause) {
    error.value = cause.response?.data?.error || '商品咨询加载失败，请稍后重试'
  }
})

onMounted(async () => {
  try {
    await loadConversations()
    conversationPoll = window.setInterval(() => {
      loadConversations().catch((cause) => {
        error.value = cause.response?.data?.error || '商品咨询列表更新失败'
      })
    }, 5000)
    messagePoll = window.setInterval(refreshMessages, 3000)
  } catch (cause) {
    error.value = cause.response?.data?.error || '商品咨询加载失败，请稍后重试'
  }
})

onBeforeUnmount(() => {
  window.clearInterval(conversationPoll)
  window.clearInterval(messagePoll)
})
</script>

<template>
  <div class="inquiry-layout">
    <aside class="inquiry-list">
      <button
        v-for="conversation in conversations"
        :key="conversation.id"
        class="inquiry-contact"
        :class="{ active: activeConversation?.id === conversation.id }"
        @click="openConversation(conversation)"
      >
        <span class="contact-name">{{ conversation.target_name || conversation.target_username }}</span>
        <span class="product-name">{{ conversation.target_product_name }}</span>
        <el-badge v-if="conversation.unread" :value="conversation.unread" />
      </button>
      <el-empty v-if="!conversations.length" description="还没有商品咨询" :image-size="72" />
    </aside>

    <section class="inquiry-thread">
      <template v-if="activeConversation">
        <header class="thread-header">
          <strong>{{ activeConversation.target_name || activeConversation.target_username }}</strong>
          <span>商品：{{ activeConversation.target_product_name }}</span>
        </header>
        <div class="thread-messages" v-loading="loading">
          <div
            v-for="message in messages"
            :key="message.id"
            class="message"
            :class="{ mine: String(message.sender_id) === currentUserId }"
          >
            <p>{{ message.content }}</p>
            <time>{{ new Date(message.created_at).toLocaleString('zh-CN') }}</time>
          </div>
          <el-empty v-if="!messages.length && !loading" description="发送消息，开始咨询商品" :image-size="72" />
        </div>
        <form class="thread-compose" @submit.prevent="sendMessage">
          <el-input
            v-model="draft"
            maxlength="2000"
            placeholder="输入商品咨询内容..."
            @keydown.enter.exact.prevent="sendMessage"
          />
          <el-button type="primary" :loading="sending" :disabled="!draft.trim()" @click="sendMessage">
            发送
          </el-button>
        </form>
      </template>
      <el-empty v-else description="选择商品咨询开始对话" />
      <p v-if="error" class="thread-error">{{ error }}</p>
    </section>
  </div>
</template>

<style scoped>
.inquiry-layout {
  display: grid;
  grid-template-columns: minmax(190px, 270px) minmax(0, 1fr);
  min-height: 420px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.inquiry-list {
  overflow-y: auto;
  border-right: 1px solid var(--color-border);
}
.inquiry-contact {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
  padding: 14px 16px;
  border: 0;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
}
.inquiry-contact.active {
  background: var(--color-bg);
}
.contact-name { font-weight: 600; }
.product-name {
  color: var(--color-text-muted);
  font-size: 12px;
}
.inquiry-thread {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.thread-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-border);
}
.thread-header span,
.message time {
  color: var(--color-text-muted);
  font-size: 12px;
}
.thread-messages {
  display: flex;
  flex: 1;
  min-height: 280px;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding: 16px;
  background: var(--color-bg);
}
.message {
  max-width: 78%;
  align-self: flex-start;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--color-surface);
  overflow-wrap: anywhere;
}
.message.mine {
  align-self: flex-end;
  background: rgba(165, 55, 47, 0.1);
}
.message p { white-space: pre-wrap; }
.message time {
  display: block;
  margin-top: 5px;
  text-align: right;
}
.thread-compose {
  display: flex;
  gap: 10px;
  padding: 12px;
  border-top: 1px solid var(--color-border);
}
.thread-error {
  padding: 8px 12px;
  color: var(--el-color-danger);
  font-size: 13px;
}
@media (max-width: 640px) {
  .inquiry-layout { grid-template-columns: 1fr; }
  .inquiry-list {
    display: flex;
    max-height: 135px;
    border-right: 0;
    border-bottom: 1px solid var(--color-border);
  }
  .inquiry-contact { min-width: 170px; }
}
</style>
