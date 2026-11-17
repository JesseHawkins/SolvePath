import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Layout } from "./components/Layout";
import { Diagnostics } from "./routes/Diagnostics";
import { GuideIndex } from "./routes/GuideIndex";
import { GuidePageView } from "./routes/GuidePageView";
import { Home } from "./routes/Home";
import { NotFound } from "./routes/NotFound";

// three.js is big, so the cube page loads only when someone opens it.
const VirtualCube = lazy(() =>
  import("./routes/VirtualCube").then((m) => ({ default: m.VirtualCube })),
);

// The scan test page loads only when opened.
const ScanLab = lazy(() => import("./routes/ScanLab").then((m) => ({ default: m.ScanLab })));

// BASE_URL is "/" normally, or "/cube/" when hosted inside a folder.
const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { index: true, element: <Home /> },
        { path: "guide", element: <GuideIndex /> },
        { path: "guide/:pageId", element: <GuidePageView /> },
        {
          path: "cube",
          element: (
            <Suspense fallback={null}>
              <VirtualCube />
            </Suspense>
          ),
        },
        {
          path: "scan",
          element: (
            <Suspense fallback={null}>
              <ScanLab />
            </Suspense>
          ),
        },
        { path: "diagnostics", element: <Diagnostics /> },
        { path: "*", element: <NotFound /> },
      ],
    },
  ],
  { basename },
);

export function App() {
  return <RouterProvider router={router} />;
}
