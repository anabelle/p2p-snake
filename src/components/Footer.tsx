import React from 'react';
import styles from './Footer.module.css';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const githubRepoUrl = 'https://github.com/anabelle/p2p-snake';

  return (
    <footer className={styles.footer} role='contentinfo'>
      <div className={styles.mainLine} data-testid='main-line'>
        <span className={styles.copyleft} aria-hidden='true' data-testid='copyleft-symbol'>
          ©
        </span>
        {currentYear} Built with <span aria-label='heart on fire'>❤️‍🔥</span> by{' '}
        <a
          href='https://x.com/heyanabelle'
          target='_blank'
          rel='noopener noreferrer'
          className={styles.link}
        >
          heyanabelle
        </a>
      </div>
      <div className={styles.sourceLine}>
        <a
          href={githubRepoUrl}
          target='_blank'
          rel='noopener noreferrer'
          className={`${styles.link} ${styles.sourceLink}`}
        >
          source code
        </a>
      </div>
    </footer>
  );
};

export default Footer;
