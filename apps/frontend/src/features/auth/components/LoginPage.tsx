import type { ReactNode } from 'react'
import styles from './LoginPage.module.css'

type LoginPageProps = {
  children: ReactNode
}

export function LoginPage({ children }: LoginPageProps) {
  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />
      <main className={styles.main}>
        <section className={styles.card}>{children}</section>
      </main>
    </div>
  )
}
