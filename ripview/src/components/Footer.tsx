import styles from './Footer.module.css';

/**
 * Attribution footer.
 *
 * The data source has to be credited: the Transport for NSW Open Data licence
 * requires it, and it also tells the user where the times come from — which is
 * the difference between "the app is wrong" and "the network is delayed".
 */
export default function Footer() {
    return (
        <footer className={styles.footer}>
            <p>
                Timetable and real-time data from{' '}
                <a
                    href='https://opendata.transport.nsw.gov.au/'
                    target='_blank'
                    rel='noreferrer noopener'
                >
                    Transport for NSW Open Data
                </a>
                .
            </p>
            <p className={styles.disclaimer}>
                RipView is an independent project and is not affiliated with Transport for NSW.
            </p>
        </footer>
    );
}
