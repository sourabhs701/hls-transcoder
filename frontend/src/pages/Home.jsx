import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import VideoPlayer from "../components/VideoPlayer";

const socket = io("http://localhost:9001");

const Home = () => {
    const [s3Url, setS3Url] = useState("");
    const [projectId, setProjectId] = useState("");
    const [hlsUrl, setHlsUrl] = useState("");
    const [logs, setLogs] = useState([]);
    const logRef = useRef(null);
    const playerRef = useRef(null);

    const videoJsOptions = {
        autoplay: false,
        controls: true,
        fluid: true,
        sources: [{
            src: hlsUrl,
            type: 'application/x-mpegURL'
        }]
    };

    const handlePlayerReady = player => {
        playerRef.current = player;
        player.on('waiting', () => console.log('video is buffering…'));
        player.on('dispose', () => console.log('player disposed'));
    };


    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logs]);

    useEffect(() => {
        if (projectId) {
            const channel = `logs:${projectId}`;
            socket.emit("subscribe", channel);

            socket.on("message", (msg) => {
                if (msg.includes("hls:")) {
                    const obj = JSON.parse(msg);
                    const url = obj.log.replace(/^hls:/, '');
                    setHlsUrl(url);
                    console.log(url);
                }
                setLogs((prev) => [...prev, msg]);
            });

            return () => {
                socket.off("message");
            };
        }
    }, [projectId]);

    const handleSubmit = (e) => {
        e.preventDefault();
        fetch("http://localhost:9000/transcode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ s3Url }),
        })
            .then((res) => res.json())
            .then((data) => {
                setProjectId(data.projectId);
                setLogs([]);
            });
    };

    return (
        <section className="container mx-auto px-4">
            <div className="flex flex-col items-center justify-center min-h-screen">
                <form
                    className="flex gap-4 items-center bg-white p-6 rounded shadow mb-8"
                    onSubmit={handleSubmit}
                >
                    <input
                        type="text"
                        placeholder="Enter S3 URL"
                        name="s3Url"
                        value={s3Url}
                        onChange={(e) => setS3Url(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                    >
                        Start Transcoding
                    </button>
                </form>
                <div className="flex flex-col items-center space-y-2 mb-6">
                    <p className="text-lg">Project ID: <span className="font-mono text-gray-700">{projectId}</span></p>
                    <p className="text-lg">HLS URL: <span className="font-mono text-blue-600">{hlsUrl}</span></p>
                </div>
                {/* Live logs display */}
                <div
                    ref={logRef}
                    className="w-full max-w-lg h-56 bg-gray-900 text-green-300 rounded overflow-y-scroll p-4 shadow font-mono text-sm"
                >
                    <h3 className="font-bold text-white mb-2">Transcoding Logs</h3>
                    <pre className="whitespace-pre-wrap">
                        {logs.map((msg, idx) => (
                            <div key={idx}>{msg}</div>
                        ))}
                    </pre>
                </div>
                {hlsUrl && (
                    <div className="w-full max-w-lg">
                        <VideoPlayer options={videoJsOptions} onReady={handlePlayerReady} />
                        <p className="text-green-600 mt-2">Your video is ready to play as HLS!</p>
                    </div>
                )}

            </div>
        </section>
    );
};

export default Home;
