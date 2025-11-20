export interface DocItem {
  key: string;
  title: string;
  sub: string;
  file: string;
  group?: string;
}

export interface DocGroup {
  group: string;
  collapsed: boolean;
  items: DocItem[];
}

export const docGroups: DocGroup[] = [
  {
    group: 'Frontend · Vue 3',
    collapsed: false,
    items: [
      {
        key: 'frontend-vue3',
        title: 'Vue 3 架構與目錄',
        sub: '前端專案結構與主要技術',
        file: 'docs/frontend-vue3.md'
      },
      {
        key: 'frontend-api',
        title: '前端 API 串接規範',
        sub: '與 Java / .NET 後端的呼叫規則',
        file: '/docs/frontend-api-integration.md'
      }
    ]
  },
  {
    group: 'Backend · Java',
    collapsed: false,
    items: [
      {
        key: 'backend-java',
        title: 'Java / Spring Boot 服務',
        sub: '核心業務 Domain 與資料存取',
        file: '/docs/backend-java.md'
      }
    ]
  },
  {
    group: 'Backend · .NET Core',
    collapsed: false,
    items: [
      {
        key: 'backend-dotnet',
        title: '.NET 微服務架構',
        sub: 'Web API + Gateway',
        file: '/docs/backend-dotnet.md'
      }
    ]
  },
  {
    group: 'DevOps',
    collapsed: false,
    items: [
      {
        key: 'devops-ci-cd',
        title: 'CI/CD + Docker',
        sub: '部署與環境',
        file: '/docs/devops-ci-cd.md'
      }
    ]
  }
];
