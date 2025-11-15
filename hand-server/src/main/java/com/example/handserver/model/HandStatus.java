package com.example.handserver.model;

public class HandStatus {
    private HandData left;
    private HandData right;

    public static class HandData {
        public Boolean open;
        public Boolean closed;
        public Integer fingers;

        public HandData() {}
        public HandData(Boolean open, Boolean closed, Integer fingers) {
            this.open = open;
            this.closed = closed;
            this.fingers = fingers;
        }
    }

    public HandStatus() {}

    public HandData getLeft() { return left; }
    public void setLeft(HandData left) { this.left = left; }
    public HandData getRight() { return right; }
    public void setRight(HandData right) { this.right = right; }
}
