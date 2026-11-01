export default function Footer() {
    return (
        <footer>
            <p className="mt-1">

                Please don't lie about your experiences. If you have any questions,
                <a
                    href="https://www.reddit.com/message/compose?to=r/DonutSMP"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#ff4500" }}
                >
                    {" "}write a modmail
                </a>.
            </p>
        </footer>
    );
}