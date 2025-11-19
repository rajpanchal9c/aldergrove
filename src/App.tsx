import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import Layout from "./components/Layout";
import TreeView from "./pages/TreeView";
import AddMember from "./pages/AddMember";

const queryClient = new QueryClient();

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <Router>
                <Layout>
                    <Routes>
                        <Route path="/" element={<TreeView />} />
                        <Route path="/add-member" element={<AddMember />} />
                    </Routes>
                </Layout>
            </Router>
            <Toaster />
        </QueryClientProvider>
    );
}

export default App;
